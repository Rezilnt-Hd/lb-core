export interface Template {
  pk: string;            // TEMPLATE#{niche}
  sk: string;            // v#{version}
  niche: string;
  version: number;
  s3Key: string;         // Path to template assets in S3
  dribbbleRef?: string;  // Original Dribbble shot URL for reference
  pages: string[];       // ['homepage', 'about', 'services', 'blog', 'contact']
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  createdAt: string;
}
