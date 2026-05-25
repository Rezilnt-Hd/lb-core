export interface BlogPost {
    slug: string;
    title: string;
    primaryKeyword: string;
    secondaryKeywords: string[];
    content: string;
    wordCount: number;
}
export interface KeywordData {
    keyword: string;
    searchVolume?: number;
    difficulty?: number;
    source: 'serpapi_paa' | 'serpapi_autocomplete' | 'kwplanner';
}
export interface RobotsTxtConfig {
    allowAiBots: boolean;
    customRules?: string[];
}
export interface Site {
    pk: string;
    sk: string;
    leadSlug: string;
    templateId: string;
    keywords: KeywordData[];
    blogPosts: BlogPost[];
    robotsTxt: RobotsTxtConfig;
    scrapedContent?: string;
    lighthouseScore?: number;
    builtAt?: string;
    deployedAt?: string;
}
