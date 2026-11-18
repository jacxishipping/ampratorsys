export interface SiteBrandingConfig {
  companyName: string;
  companyTagline?: string;
  logoUrl: string;
  headerLogoUrl?: string;
  faviconUrl?: string;
  updatedAt?: string;
}

export const DEFAULT_SITE_BRANDING: SiteBrandingConfig = {
  companyName: 'AMPRATOR SHIPPING',
  companyTagline: 'Vehicle Logistics',
  logoUrl: '/main-logo.png',
  headerLogoUrl: '/higher-logo.png',
  faviconUrl: '/favicon.png',
};

export const siteBrandAssets = {
  favicon: '/favicon.png',
  headerLogo: '/amprator-logo-hd.png',
  mainLogo: '/amprator-logo.png',
} as const;

export const siteBrandAssetFiles = {
  favicon: 'public/favicon.png',
} as const;