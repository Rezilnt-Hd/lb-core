import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/utils/secrets.js', () => ({ getSecret: vi.fn().mockResolvedValue('fc-key') }));
const mockInvoke = vi.fn();
vi.mock('../../src/bedrock/adapter.js', () => ({ invokeBedrock: (...a: unknown[]) => mockInvoke(...a) }));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const { captureExistingSite, scrapeExistingSite } = await import('../../src/scrape/existing-site.js');

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { markdown: '# Acme Lawn\nWe mow lawns.', metadata: { title: 'Acme Lawn Care', description: 'Charlotte lawns' } } }),
  });
  mockInvoke.mockResolvedValue({ text: JSON.stringify({ services: ['mowing'], about: 'Local lawn crew.' }) });
});

describe('scrapeExistingSite', () => {
  it('returns null on a non-ok Firecrawl response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' });
    expect(await scrapeExistingSite('https://x.com')).toBeNull();
  });
  it('maps Firecrawl markdown/title/description', async () => {
    const r = await scrapeExistingSite('https://x.com');
    expect(r).toEqual({ markdown: '# Acme Lawn\nWe mow lawns.', title: 'Acme Lawn Care', description: 'Charlotte lawns' });
  });
});

describe('captureExistingSite', () => {
  it('assembles an ExistingSite with facets from Bedrock + raw fields from Firecrawl', async () => {
    const es = await captureExistingSite('https://x.com', { businessName: 'Acme', niche: 'landscaping' });
    expect(es).toMatchObject({
      url: 'https://x.com',
      headline: 'Acme Lawn Care',
      metaDescription: 'Charlotte lawns',
      services: ['mowing'],
      about: 'Local lawn crew.',
      discovered: false,
    });
    expect(es!.rawMarkdown).toContain('Acme Lawn');
    expect(typeof es!.scrapedAt).toBe('string');
  });
  it('returns null when the scrape itself fails (no usable site)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => 'nf' });
    expect(await captureExistingSite('https://x.com', { businessName: 'Acme', niche: 'landscaping' })).toBeNull();
  });
  it('still returns raw fields when facet extraction fails (best-effort)', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('bedrock down'));
    const es = await captureExistingSite('https://x.com', { businessName: 'Acme', niche: 'landscaping' });
    expect(es!.headline).toBe('Acme Lawn Care');
    expect(es!.services).toBeUndefined();
  });
  it('marks discovered=true when passed', async () => {
    const es = await captureExistingSite('https://x.com', { businessName: 'Acme', niche: 'landscaping', discovered: true });
    expect(es!.discovered).toBe(true);
  });
  it('still extracts facets when Haiku wraps the JSON in a ```json fence', async () => {
    mockInvoke.mockResolvedValueOnce({ text: '```json\n{"services":["drain cleaning"],"about":"Family plumber"}\n```' });
    const es = await captureExistingSite('https://x.com', { businessName: 'Acme', niche: 'plumbing' });
    expect(es!.services).toEqual(['drain cleaning']);
    expect(es!.about).toBe('Family plumber');
  });
});
