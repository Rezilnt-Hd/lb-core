import { getSecret } from '../utils/secrets.js';
import { invokeBedrock } from '../bedrock/adapter.js';
import { createLogger } from '../utils/logger.js';
const log = createLogger('existing-site');
const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';
const FACET_MODEL_ID = process.env.BEDROCK_MODEL_FACET || 'us.anthropic.claude-haiku-4-5';
const MAX_MARKDOWN = 8192;
/** Firecrawl-scrape a URL to markdown. Best-effort: returns null on any failure. */
export async function scrapeExistingSite(url) {
    let key;
    try {
        key = await getSecret('lb/scraping', 'firecrawl', 'FIRECRAWL_API_KEY');
    }
    catch (err) {
        log.warn('Firecrawl key unavailable', { err: String(err) });
        return null;
    }
    try {
        const res = await fetch(`${FIRECRAWL_BASE}/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify({ url, formats: ['markdown'] }),
        });
        if (!res.ok) {
            log.warn('Firecrawl scrape non-ok', { url, status: res.status });
            return null;
        }
        const json = (await res.json());
        const markdown = json.data?.markdown ?? '';
        if (!markdown.trim())
            return null;
        return { markdown, title: json.data?.metadata?.title ?? '', description: json.data?.metadata?.description ?? '' };
    }
    catch (err) {
        log.warn('Firecrawl scrape threw', { url, err: String(err) });
        return null;
    }
}
/** Extract structured facets (services, about) from scraped markdown via Haiku. */
async function extractFacets(scraped, businessName, niche) {
    const prompt = `Extract facts from this ${niche} business's existing website. Business: ${businessName}.
Return VALID JSON only: {"services": string[], "about": string}.
- services: up to 8 services they currently advertise (short noun phrases). [] if none clear.
- about: one sentence (<= 30 words) summarizing their positioning, in their own framing. "" if unclear.
Do NOT invent anything not supported by the text.

WEBSITE MARKDOWN:
${scraped.markdown.slice(0, MAX_MARKDOWN)}`;
    const { text } = await invokeBedrock({
        callSite: 'existing-site-facets',
        modelId: FACET_MODEL_ID,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 600,
        temperature: 0,
    });
    const cleaned = text.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const services = Array.isArray(parsed.services)
        ? parsed.services.filter((s) => typeof s === 'string' && !!s.trim()).slice(0, 8)
        : undefined;
    const about = typeof parsed.about === 'string' && parsed.about.trim() ? parsed.about.trim() : undefined;
    return { services: services?.length ? services : undefined, about };
}
/**
 * Scrape + extract a prospect's existing site into an ExistingSite. Returns null
 * only when the scrape yields no usable content. Facet extraction is best-effort:
 * if Bedrock fails, the raw Firecrawl fields are still returned.
 */
export async function captureExistingSite(url, opts) {
    const scraped = await scrapeExistingSite(url);
    if (!scraped)
        return null;
    let facets = {};
    try {
        facets = await extractFacets(scraped, opts.businessName, opts.niche);
    }
    catch (err) {
        log.warn('Facet extraction failed; storing raw scrape only', { url, err: String(err) });
    }
    return {
        scrapedAt: new Date().toISOString(),
        url,
        discovered: opts.discovered ?? false,
        headline: scraped.title || undefined,
        metaDescription: scraped.description || undefined,
        rawMarkdown: scraped.markdown.slice(0, MAX_MARKDOWN),
        services: facets.services,
        about: facets.about,
    };
}
