import { describe, it, expect } from 'vitest';
import { isBlockedIp, assertPublicUrl, safeFetch, SsrfError } from '../../src/net/safe-fetch.js';

describe('isBlockedIp', () => {
  it.each([
    '127.0.0.1', '127.1.2.3',        // loopback
    '10.0.0.1', '10.255.255.255',    // RFC1918 /8
    '172.16.0.1', '172.31.255.255',  // RFC1918 /12
    '192.168.1.1',                   // RFC1918 /16
    '169.254.169.254', '169.254.0.1',// link-local (incl. cloud IMDS)
    '0.0.0.0',                       // unspecified
    '100.64.0.1',                    // CGNAT
    '::1',                           // IPv6 loopback
    'fc00::1', 'fd12:3456::1',       // IPv6 ULA
    'fe80::1',                       // IPv6 link-local
    '::ffff:127.0.0.1',              // IPv4-mapped loopback
    '::ffff:169.254.169.254',        // IPv4-mapped IMDS
    'not-an-ip',                     // garbage → blocked defensively
  ])('blocks internal/invalid address %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8', '1.1.1.1',            // public DNS
    '172.15.0.1', '172.32.0.1',      // just outside the /12
    '93.184.216.34',                 // example.com
    '2606:4700:4700::1111',          // Cloudflare IPv6
  ])('allows public address %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

describe('assertPublicUrl', () => {
  const lookupPublic = async () => ['93.184.216.34'];
  const lookupPrivate = async () => ['10.0.0.5'];

  it('rejects non-http(s) schemes', async () => {
    await expect(assertPublicUrl('file:///etc/passwd', lookupPublic)).rejects.toBeInstanceOf(SsrfError);
    await expect(assertPublicUrl('gopher://x/', lookupPublic)).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects a literal internal IP host', async () => {
    await expect(assertPublicUrl('http://169.254.169.254/latest/meta-data/', lookupPublic)).rejects.toBeInstanceOf(SsrfError);
    await expect(assertPublicUrl('http://[::1]/', lookupPublic)).rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects a hostname that resolves to an internal IP', async () => {
    await expect(assertPublicUrl('http://evil.example.com/', lookupPrivate)).rejects.toBeInstanceOf(SsrfError);
  });

  it('allows a public hostname', async () => {
    const u = await assertPublicUrl('https://example.com/logo.png', lookupPublic);
    expect(u.hostname).toBe('example.com');
  });
});

describe('safeFetch', () => {
  const publicLookup = async () => ['93.184.216.34'];
  function makeFetch(responses: Array<{ status: number; headers?: Record<string, string>; body?: string }>) {
    let i = 0;
    return async () => {
      const r = responses[Math.min(i++, responses.length - 1)];
      return new Response(r.body ?? 'ok', { status: r.status, headers: r.headers });
    };
  }

  it('fetches a public URL and returns the response', async () => {
    const res = await safeFetch('https://example.com/', {
      _lookup: publicLookup,
      _fetch: makeFetch([{ status: 200, body: 'hello' }]) as never,
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('hello');
  });

  it('blocks a redirect that targets an internal address', async () => {
    const _fetch = makeFetch([{ status: 302, headers: { location: 'http://169.254.169.254/' } }]);
    await expect(safeFetch('https://example.com/', { _lookup: publicLookup, _fetch: _fetch as never }))
      .rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects when the redirect chain exceeds maxRedirects', async () => {
    const _fetch = makeFetch([{ status: 302, headers: { location: 'https://example.com/next' } }]);
    await expect(safeFetch('https://example.com/', { maxRedirects: 2, _lookup: publicLookup, _fetch: _fetch as never }))
      .rejects.toBeInstanceOf(SsrfError);
  });

  it('rejects a response whose Content-Length exceeds maxBytes', async () => {
    const _fetch = makeFetch([{ status: 200, headers: { 'content-length': String(10_000_000) }, body: 'big' }]);
    await expect(safeFetch('https://example.com/', { maxBytes: 5_000_000, _lookup: publicLookup, _fetch: _fetch as never }))
      .rejects.toBeInstanceOf(SsrfError);
  });

  it('follows a same-host redirect to a public target', async () => {
    const _fetch = makeFetch([
      { status: 301, headers: { location: 'https://example.com/final' } },
      { status: 200, body: 'arrived' },
    ]);
    const res = await safeFetch('https://example.com/', { _lookup: publicLookup, _fetch: _fetch as never });
    expect(await res.text()).toBe('arrived');
  });
});
