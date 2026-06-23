/**
 * A prospect's CURRENT (pre-LocalBuilder) website, captured once at enrichment.
 * Single source of truth consumed by lb-site-builder (Phase 2) and lb-outreach
 * (Phase 3). Absence (undefined) means "no existing site captured" — every
 * consumer must degrade to metadata-only behavior. A failed/empty scrape is a
 * normal state, never an error.
 */
export interface ExistingSite {
  /** ISO timestamp of the scrape. */
  scrapedAt: string;
  /** The URL scraped (lead.website at scrape time). */
  url: string;
  /** True if the URL was found via Phase-1b discovery rather than SERP. */
  discovered?: boolean;
  /** Services the business currently advertises. */
  services?: string[];
  /** Positioning / about blurb (trimmed, capped). */
  about?: string;
  /** Their current hero/headline line (Firecrawl page title). */
  headline?: string;
  /** Concise classification of what this business ACTUALLY is, derived from the scraped
   *  site — distinguishes e.g. a "landscape design & architecture firm" from a
   *  "residential lawn maintenance service" even when both are discovered under the
   *  coarse "landscaping" niche. Drives accurate site copy + template variant selection. */
  businessType?: string;
  /** Firecrawl meta description. */
  metaDescription?: string;
  /** Firecrawl markdown, length-capped (≤ 8 KB). */
  rawMarkdown?: string;
  /**
   * Raw image URLs discovered on the prospect's existing site (homepage + a few
   * high-value pages), captured pre-curation. The site-builder's image-curator
   * scores/tags/selects from these at build time. Capped (≤ ~30). Absent ⇒ no
   * usable imagery discovered (a normal state).
   */
  candidateImages?: { url: string; alt?: string; pageUrl?: string }[];
  /** Provenance: the page URLs actually scraped (homepage + deepened pages). */
  scrapedPages?: string[];
}
