import { getSecret } from '../utils/secrets.js';
import { invokeBedrock } from '../bedrock/adapter.js';
import { createLogger } from '../utils/logger.js';
const log = createLogger('existing-site');
const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';
const FACET_MODEL_ID = process.env.BEDROCK_MODEL_FACET || 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
const MAX_MARKDOWN = 8192;
const MAX_CANDIDATE_IMAGES = 30;
const DEEPEN_PATH_KEYWORDS = ['gallery', 'portfolio', 'work', 'project', 'about', 'team', 'service'];
const MAX_DEEPEN_PAGES = 3;
/** Firecrawl /map → URL list, filtered to high-value paths. Best-effort: [] on failure. */
export async function discoverHighValuePages(url, key) {
    try {
        const res = await fetch(`${FIRECRAWL_BASE}/map`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify({ url }),
        });
        if (!res.ok)
            return [];
        const json = (await res.json());
        const links = json.links ?? [];
        const origin = new URL(url).origin;
        const picked = links
            .filter(l => { try {
            return new URL(l).origin === origin;
        }
        catch {
            return false;
        } })
            .filter(l => DEEPEN_PATH_KEYWORDS.some(k => l.toLowerCase().includes(k)))
            .filter(l => l.replace(/\/$/, '') !== url.replace(/\/$/, '')); // not the homepage
        return Array.from(new Set(picked)).slice(0, MAX_DEEPEN_PAGES);
    }
    catch {
        return [];
    }
}
/** Extract absolute <img> src URLs (+ alt) from HTML, resolved against pageUrl. De-dupes. */
export function extractImageUrls(html, pageUrl) {
    if (!html)
        return [];
    const out = [];
    const seen = new Set();
    const imgRe = /<img\b[^>]*>/gi;
    const srcRe = /\bsrc=["']([^"']+)["']/i;
    const altRe = /\balt=["']([^"']*)["']/i;
    for (const tag of html.match(imgRe) ?? []) {
        const srcM = tag.match(srcRe);
        if (!srcM)
            continue;
        let src = srcM[1].trim();
        if (!src || src.startsWith('data:'))
            continue; // skip inline/data-URI sprites
        try {
            src = new URL(src, pageUrl).href;
        }
        catch {
            continue;
        }
        if (seen.has(src))
            continue;
        seen.add(src);
        const altM = tag.match(altRe);
        out.push({ url: src, alt: altM?.[1]?.trim() || undefined, pageUrl });
        if (out.length >= MAX_CANDIDATE_IMAGES)
            break;
    }
    return out;
}
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
            body: JSON.stringify({ url, formats: ['markdown', 'html'] }),
        });
        if (!res.ok) {
            log.warn('Firecrawl scrape non-ok', { url, status: res.status });
            return null;
        }
        const json = (await res.json());
        const markdown = json.data?.markdown ?? '';
        if (!markdown.trim())
            return null;
        return {
            markdown,
            html: json.data?.html ?? '',
            title: json.data?.metadata?.title ?? '',
            description: json.data?.metadata?.description ?? '',
        };
    }
    catch (err) {
        log.warn('Firecrawl scrape threw', { url, err: String(err) });
        return null;
    }
}
/** Extract structured facets (services, about, businessType) from scraped markdown via Haiku. */
async function extractFacets(scraped, businessName, niche) {
    const prompt = `Extract facts from this ${niche} business's existing website. Business: ${businessName}.
Return VALID JSON only: {"services": string[], "about": string, "businessType": string}.
- services: up to 8 services they currently advertise (short noun phrases). [] if none clear.
- about: one sentence (<= 30 words) summarizing their positioning, in their own framing. "" if unclear.
- businessType: a short, specific phrase naming what this business actually is, based on what the site emphasizes — be precise about specialization. Examples: "landscape design & architecture firm", "residential lawn maintenance service", "high-end custom pool builder", "emergency water-damage restoration company". Prefer the specific specialization over the generic category. If unclear, use the most defensible specific phrase the content supports.
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
    const businessType = typeof parsed.businessType === 'string' && parsed.businessType.trim()
        ? parsed.businessType.trim().slice(0, 120)
        : undefined;
    return { services: services?.length ? services : undefined, about, businessType };
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
    const scrapedPages = [url];
    let allImages = extractImageUrls(scraped.html, url);
    if (opts.deepen) {
        let key;
        try {
            key = await getSecret('lb/scraping', 'firecrawl', 'FIRECRAWL_API_KEY');
        }
        catch {
            key = undefined;
        }
        if (key) {
            const pages = await discoverHighValuePages(url, key);
            for (const page of pages) {
                const sub = await scrapeExistingSite(page);
                if (!sub)
                    continue;
                scrapedPages.push(page);
                for (const img of extractImageUrls(sub.html, page)) {
                    if (!allImages.some(e => e.url === img.url))
                        allImages.push(img);
                }
            }
        }
    }
    allImages = allImages.slice(0, MAX_CANDIDATE_IMAGES);
    return {
        scrapedAt: new Date().toISOString(),
        url,
        discovered: opts.discovered ?? false,
        headline: scraped.title || undefined,
        businessType: facets.businessType,
        metaDescription: scraped.description || undefined,
        rawMarkdown: scraped.markdown.slice(0, MAX_MARKDOWN),
        services: facets.services,
        about: facets.about,
        candidateImages: allImages.length ? allImages : undefined,
        scrapedPages,
    };
}
