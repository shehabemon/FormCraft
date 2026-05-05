import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/builder/', '/auth/'],
      },
    ],
    sitemap: 'https://formcraft.app/sitemap.xml',
  };
}
