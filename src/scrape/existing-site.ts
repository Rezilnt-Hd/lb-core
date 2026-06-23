import { getSecret } from '../utils/secrets.js';
import { invokeBedrock } from '../bedrock/adapter.js';
import { createLogger } from '../utils/logger.js';
import type { ExistingSite } from '../types/existing-site.js';

const log = createLogger('existing-site');
const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v1';
const FACET_MODEL_ID = process.env.BEDROCK_MODEL_FACET || 'us.anthropic.claude-haiku-4-5-20251001-v1:0';
const MAX_MARKDOWN = 8192;

export interface ScrapedContent { markdown: string; html: string; title: string; description: string; }

const MAX_CANDIDATE_IMAGES = 30;

/** Extract absolute <img> src URLs (+ alt) from HTML, resolved against pageUrl. De-dupes. */
export function extractImageUrls(html: string, pageUrl: string): { url: string; alt?: string; pageUrl: string }[] {
  if (!html) return [];
  const out: { url: string; alt?: string; pageUrl: string }[] = [];
  const seen = new Set<string>();
  const imgRe = /<img\b[^>]*>/gi;
  const srcRe = /\bsrc=["']([^"']+)["']/i;
  const altRe = /\balt=["']([^"']*)["']/i;
  for (const tag of html.match(imgRe) ?? []) {
    const srcM = tag.match(srcRe);
    if (!srcM) continue;
    let src = srcM[1].trim();
    if (!src || src.startsWith('data:')) continue; // skip inline/data-URI sprites
    try { src = new URL(src, pageUrl).href; } catch { continue; }
    if (seen.has(src)) continue;
    seen.add(src);
    const altM = tag.match(altRe);
    out.push({ url: src, alt: altM?.[1]?.trim() || undefined, pageUrl });
    if (out.length >= MAX_CANDIDATE_IMAGES) break;
  }
  return out;
}

/** Firecrawl-scrape a URL to markdown. Best-effort: returns null on any failure. */
export async function scrapeExistingSite(url: string): Promise<ScrapedContent | null> {
  let key: string;
  try {
    key = await getSecret('lb/scraping', 'firecrawl', 'FIRECRAWL_API_KEY');
  } catch (err) {
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
    const json = (await res.json()) as { data?: { markdown?: string; html?: string; metadata?: { title?: string; description?: string } } };
    const markdown = json.data?.markdown ?? '';
    if (!markdown.trim()) return null;
    return {
      markdown,
      html: json.data?.html ?? '',
      title: json.data?.metadata?.title ?? '',
      description: json.data?.metadata?.description ?? '',
    };
  } catch (err) {
    log.warn('Firecrawl scrape threw', { url, err: String(err) });
    return null;
  }
}

/** Extract structured facets (services, about, businessType) from scraped markdown via Haiku. */
async function extractFacets(scraped: ScrapedContent, businessName: string, niche: string): Promise<{ services?: string[]; about?: string; businessType?: string }> {
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
  const parsed = JSON.parse(cleaned) as { services?: unknown; about?: unknown; businessType?: unknown };
  const services = Array.isArray(parsed.services)
    ? parsed.services.filter((s): s is string => typeof s === 'string' && !!s.trim()).slice(0, 8)
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
export async function captureExistingSite(
  url: string,
  opts: { businessName: string; niche: string; discovered?: boolean },
): Promise<ExistingSite | null> {
  const scraped = await scrapeExistingSite(url);
  if (!scraped) return null;

  let facets: { services?: string[]; about?: string; businessType?: string } = {};
  try {
    facets = await extractFacets(scraped, opts.businessName, opts.niche);
  } catch (err) {
    log.warn('Facet extraction failed; storing raw scrape only', { url, err: String(err) });
  }

  const candidateImages = extractImageUrls(scraped.html, url);

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
    candidateImages: candidateImages.length ? candidateImages : undefined,
    scrapedPages: [url],
  };
}
