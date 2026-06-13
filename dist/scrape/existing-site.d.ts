import type { ExistingSite } from '../types/existing-site.js';
export interface ScrapedContent {
    markdown: string;
    title: string;
    description: string;
}
/** Firecrawl-scrape a URL to markdown. Best-effort: returns null on any failure. */
export declare function scrapeExistingSite(url: string): Promise<ScrapedContent | null>;
/**
 * Scrape + extract a prospect's existing site into an ExistingSite. Returns null
 * only when the scrape yields no usable content. Facet extraction is best-effort:
 * if Bedrock fails, the raw Firecrawl fields are still returned.
 */
export declare function captureExistingSite(url: string, opts: {
    businessName: string;
    niche: string;
    discovered?: boolean;
}): Promise<ExistingSite | null>;
