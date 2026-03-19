import type { CountryNews } from '@/schemas/news.schema';

export function getMockCountryNews(countryId: number): CountryNews {
  return [
    {
      id: 1,
      title: `Mock news item 1 (${countryId})`,
      source: 'Mock Source',
      url: 'https://example.com/news/1',
      publishedAt: new Date().toISOString(),
      summary: 'Mock summary 1',
      sentiment: 'positive',
    },
    {
      id: 2,
      title: `Mock news item 2 (${countryId})`,
      source: 'Mock Source',
      url: 'https://example.com/news/2',
      publishedAt: new Date().toISOString(),
      summary: 'Mock summary 2',
      sentiment: 'neutral',
    },
    {
      id: 3,
      title: `Mock news item 3 (${countryId})`,
      source: 'Mock Source',
      url: 'https://example.com/news/3',
      publishedAt: new Date().toISOString(),
      summary: 'Mock summary 3',
      sentiment: 'negative',
    },
  ];
}
