export interface Template {
    pk: string;
    sk: string;
    niche: string;
    version: number;
    s3Key: string;
    dribbbleRef?: string;
    pages: string[];
    colorScheme: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    createdAt: string;
}
