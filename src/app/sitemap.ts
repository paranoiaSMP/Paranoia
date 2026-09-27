import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://paranoiastudio.fr';

  const routes = [
    '',
    '/shop',
    '/cards',
    '/launcher',
    '/jeux',
    '/candidature',
    '/editions',
    '/news',
    '/videastes',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: (route === '' || route === '/news' ? 'daily' : 'weekly') as 'daily' | 'weekly',
    priority: route === '' ? 1 : route === '/shop' ? 0.9 : 0.8,
  }));

  return routes;
}
