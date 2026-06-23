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
    json: async () => ({ success: true, data: {
      markdown: '# Acme Lawn\nWe mow lawns.',
      html: '<header><img src="/logo.png"></header><main><img src="https://cdn.acme.com/patio.jpg" alt="New patio"><img src="work2.jpg" alt="Paver walkway"></main>',
      metadata: { title: 'Acme Lawn Care', description: 'Charlotte lawns' },
    } }),
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
    expect(r!.markdown).toBe('# Acme Lawn\nWe mow lawns.');
    expect(r!.title).toBe('Acme Lawn Care');
    expect(r!.description).toBe('Charlotte lawns');
    expect(typeof r!.html).toBe('string');
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
  it('classifies businessType from the scraped site (specialization signal)', async () => {
    mockInvoke.mockResolvedValueOnce({ text: '```json\n{"services":["site planning"],"about":"Award-winning studio","businessType":"landscape design & architecture firm"}\n```' });
    const es = await captureExistingSite('https://x.com', { businessName: 'Acme', niche: 'landscaping' });
    expect(es!.businessType).toBe('landscape design & architecture firm');
  });
});

describe('candidateImages extraction', () => {
  it('parses <img> srcs from the scraped HTML, absolutized + de-duped', async () => {
    const es = await captureExistingSite('https://acme.com', { businessName: 'Acme', niche: 'landscaping' });
    const urls = es!.candidateImages!.map(c => c.url);
    expect(urls).toContain('https://cdn.acme.com/patio.jpg');
    expect(urls).toContain('https://acme.com/work2.jpg'); // relative → absolutized against page URL
    expect(es!.candidateImages!.find(c => c.url === 'https://cdn.acme.com/patio.jpg')!.alt).toBe('New patio');
  });

  it('records the scraped page in scrapedPages', async () => {
    const es = await captureExistingSite('https://acme.com', { businessName: 'Acme', niche: 'landscaping' });
    expect(es!.scrapedPages).toContain('https://acme.com');
  });

  it('omits candidateImages when the HTML has no images', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { markdown: '# Acme', html: '<p>no images here</p>', metadata: { title: 'Acme' } } }),
    });
    const es = await captureExistingSite('https://acme.com', { businessName: 'Acme', niche: 'landscaping' });
    expect(es!.candidateImages).toBeUndefined();
  });
});

describe('multi-page deepening', () => {
  it('maps the site, scrapes high-value pages, and merges their images', async () => {
    mockFetch.mockReset();
    mockFetch
      // homepage scrape
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        markdown: '# Acme', html: '<img src="https://acme.com/home.jpg" alt="home">',
        metadata: { title: 'Acme', description: '' } } }) })
      // /map
      .mockResolvedValueOnce({ ok: true, json: async () => ({ links: [
        'https://acme.com/', 'https://acme.com/about', 'https://acme.com/gallery', 'https://acme.com/blog/post-1',
      ] }) })
      // gallery scrape
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        markdown: 'gallery', html: '<img src="https://acme.com/patio.jpg" alt="patio">',
        metadata: { title: 'Gallery' } } }) })
      // about scrape
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        markdown: 'about', html: '<img src="https://acme.com/owner.jpg" alt="owner">',
        metadata: { title: 'About' } } }) });
    mockInvoke.mockResolvedValue({ text: JSON.stringify({ services: [], about: '' }) });

    const es = await captureExistingSite('https://acme.com', { businessName: 'Acme', niche: 'landscaping', deepen: true });
    const urls = es!.candidateImages!.map(c => c.url);
    expect(urls).toContain('https://acme.com/home.jpg');
    expect(urls).toContain('https://acme.com/patio.jpg');
    expect(urls).toContain('https://acme.com/owner.jpg');
    expect(es!.scrapedPages!.length).toBeGreaterThan(1);
  });

  it('does not deepen when deepen flag is absent (back-compat)', async () => {
    const es = await captureExistingSite('https://acme.com', { businessName: 'Acme', niche: 'landscaping' });
    expect(es!.scrapedPages).toEqual(['https://acme.com']);
  });
});
