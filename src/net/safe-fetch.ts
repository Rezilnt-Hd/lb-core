import { BlockList, isIP } from 'node:net';
import { lookup as dnsLookup } from 'node:dns/promises';

/** Thrown when a request is refused for SSRF reasons (blocked address, bad scheme, oversize, redirect loop). */
export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfError';
  }
}

// Non-routable / internal ranges that must never be reachable from a server-side fetch.
const blocked = new BlockList();
// IPv4
blocked.addSubnet('0.0.0.0', 8, 'ipv4'); // "this network"
blocked.addSubnet('10.0.0.0', 8, 'ipv4'); // RFC1918
blocked.addSubnet('100.64.0.0', 10, 'ipv4'); // CGNAT
blocked.addSubnet('127.0.0.0', 8, 'ipv4'); // loopback
blocked.addSubnet('169.254.0.0', 16, 'ipv4'); // link-local (incl. 169.254.169.254 cloud metadata)
blocked.addSubnet('172.16.0.0', 12, 'ipv4'); // RFC1918
blocked.addSubnet('192.0.0.0', 24, 'ipv4'); // IETF protocol assignments
blocked.addSubnet('192.168.0.0', 16, 'ipv4'); // RFC1918
blocked.addSubnet('198.18.0.0', 15, 'ipv4'); // benchmarking
blocked.addSubnet('240.0.0.0', 4, 'ipv4'); // reserved
blocked.addAddress('255.255.255.255', 'ipv4'); // broadcast
// IPv6
blocked.addAddress('::1', 'ipv6'); // loopback
blocked.addAddress('::', 'ipv6'); // unspecified
blocked.addSubnet('fc00::', 7, 'ipv6'); // unique-local (ULA)
blocked.addSubnet('fe80::', 10, 'ipv6'); // link-local

/**
 * True if `ip` is a non-public address (loopback, RFC1918, link-local/metadata, ULA, etc.).
 * Invalid input is treated as blocked (fail closed). IPv4-mapped IPv6 (`::ffff:a.b.c.d`)
 * is unwrapped and checked as IPv4 so it can't be used to smuggle an internal v4 address.
 */
export function isBlockedIp(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 0) return true;
  if (fam === 6) {
    const mapped = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(ip);
    if (mapped) return isBlockedIp(mapped[1]);
    return blocked.check(ip, 'ipv6');
  }
  return blocked.check(ip, 'ipv4');
}

export type Lookup = (host: string) => Promise<string[]>;

async function defaultLookup(host: string): Promise<string[]> {
  const results = await dnsLookup(host, { all: true });
  return results.map((r) => r.address);
}

/**
 * Validate that `rawUrl` is an http(s) URL whose host is a public address. For a literal-IP
 * host, the IP is checked directly; for a hostname, ALL resolved A/AAAA records must be public
 * (a single internal record blocks it). Returns the parsed URL or throws SsrfError.
 */
export async function assertPublicUrl(rawUrl: string, lookup: Lookup = defaultLookup): Promise<URL> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw new SsrfError(`invalid URL: ${rawUrl}`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new SsrfError(`scheme not allowed: ${u.protocol}`);
  }
  const host = u.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  if (isIP(host)) {
    if (isBlockedIp(host)) throw new SsrfError(`blocked address: ${host}`);
    return u;
  }
  if (host.toLowerCase() === 'localhost' || host.toLowerCase().endsWith('.localhost')) {
    throw new SsrfError(`blocked host: ${host}`);
  }
  const ips = await lookup(host);
  if (ips.length === 0) throw new SsrfError(`no DNS resolution: ${host}`);
  for (const ip of ips) {
    if (isBlockedIp(ip)) throw new SsrfError(`${host} resolves to blocked address ${ip}`);
  }
  return u;
}

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: BodyInit;
  /** Abort after this many ms (default 10000). */
  timeoutMs?: number;
  /** Max redirect hops to follow, each re-validated (default 3). */
  maxRedirects?: number;
  /** Reject if Content-Length exceeds this (default 5_000_000). */
  maxBytes?: number;
  /** Injected for tests. */
  _fetch?: typeof fetch;
  /** Injected for tests. */
  _lookup?: Lookup;
}

function enforceSize(res: Response, maxBytes: number): Response {
  const len = Number(res.headers.get('content-length'));
  if (Number.isFinite(len) && len > maxBytes) {
    throw new SsrfError(`response too large: ${len} > ${maxBytes}`);
  }
  return res;
}

/**
 * SSRF-hardened fetch: validates the host (and every redirect hop) against internal address
 * ranges, refuses non-http(s) schemes, follows redirects manually with `redirect: 'manual'`
 * (so a public URL can't 30x into the metadata endpoint), enforces a timeout, and caps the
 * response by Content-Length. Use this for ANY fetch of a URL that originates from a lead,
 * scrape, or other untrusted source.
 *
 * Residual: does not pin the resolved IP across the DNS-check→connect gap, so a determined
 * DNS-rebinding attacker with sub-TTL flipping is not fully covered (kernel/agent-level pinning
 * would be required). It blocks the documented vectors: direct internal URL and redirect-to-internal.
 */
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<Response> {
  const fetchImpl = opts._fetch ?? fetch;
  const lookup = opts._lookup ?? defaultLookup;
  const maxRedirects = opts.maxRedirects ?? 3;
  const timeoutMs = opts.timeoutMs ?? 10000;
  const maxBytes = opts.maxBytes ?? 5_000_000;

  let currentUrl = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicUrl(currentUrl, lookup);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(currentUrl, {
        method: opts.method,
        headers: opts.headers,
        body: opts.body,
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return enforceSize(res, maxBytes);
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }
    return enforceSize(res, maxBytes);
  }
  throw new SsrfError(`too many redirects (> ${maxRedirects})`);
}
