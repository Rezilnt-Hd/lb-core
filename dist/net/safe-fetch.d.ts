/** Thrown when a request is refused for SSRF reasons (blocked address, bad scheme, oversize, redirect loop). */
export declare class SsrfError extends Error {
    constructor(message: string);
}
/**
 * True if `ip` is a non-public address (loopback, RFC1918, link-local/metadata, ULA, etc.).
 * Invalid input is treated as blocked (fail closed). IPv4-mapped IPv6 (`::ffff:a.b.c.d`)
 * is unwrapped and checked as IPv4 so it can't be used to smuggle an internal v4 address.
 */
export declare function isBlockedIp(ip: string): boolean;
export type Lookup = (host: string) => Promise<string[]>;
/**
 * Validate that `rawUrl` is an http(s) URL whose host is a public address. For a literal-IP
 * host, the IP is checked directly; for a hostname, ALL resolved A/AAAA records must be public
 * (a single internal record blocks it). Returns the parsed URL or throws SsrfError.
 */
export declare function assertPublicUrl(rawUrl: string, lookup?: Lookup): Promise<URL>;
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
export declare function safeFetch(rawUrl: string, opts?: SafeFetchOptions): Promise<Response>;
