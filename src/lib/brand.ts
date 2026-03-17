import brandConfig from '../../brand.config.json';

export type BrandConfig = typeof brandConfig;

export const brand: BrandConfig = brandConfig;

export const brandHeadingStyle = {
  fontFamily: 'var(--font-heading)',
} as const;

export function getBrandExternalUrl(kind: 'website' | 'docs' | 'github' | 'issues'): string {
  switch (kind) {
    case 'website':
      return brand.websiteUrl;
    case 'docs':
      return brand.docsUrl;
    case 'github':
      return brand.githubUrl;
    case 'issues':
      return brand.issuesUrl;
  }
}
