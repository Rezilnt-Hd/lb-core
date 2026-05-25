export interface BlogPost {
  slug: string;
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  content: string;       // Markdown with frontmatter
  wordCount: number;
}

export interface KeywordData {
  keyword: string;
  searchVolume?: number;
  difficulty?: number;
  source: 'serpapi_paa' | 'serpapi_autocomplete' | 'kwplanner';
}

export interface Site {
  pk: string;            // SITE#{slug}
  sk: string;            // META
  leadSlug: string;
  templateId: string;
  keywords: KeywordData[];
  blogPosts: BlogPost[];
  scrapedContent?: string;
  lighthouseScore?: number;
  builtAt?: string;
  deployedAt?: string;
}
