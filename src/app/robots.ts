import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Use the actual domain if available, otherwise a placeholder
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://votre-domaine.fr';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
