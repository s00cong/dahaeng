export const queryKeys = {
  tag: {
    all: ['tag'] as const,
  },
  city: {
    all: ['city'] as const,
    list: (params?: object) => ['city', 'list', params] as const,
    detail: (cityId: number) => ['city', 'detail', cityId] as const,
    recommend: (params: object) => ['city', 'recommend', params] as const,
  },
  cost: {
    all: ['cost'] as const,
    country: (countryId: number) => ['cost', 'country', countryId] as const,
    city: (cityId: number) => ['cost', 'city', cityId] as const,
    summary: () => ['cost', 'summary'] as const,
    exchange: (base: string, target: string) => ['cost', 'exchange', base, target] as const,
    // New keys (Costapi.md)
    exchangeNew: (currency: string) => ['cost', 'exchange-new', currency] as const,
    exchangeHistory: (currency: string, type: string) => ['cost', 'exchange-history', currency, type] as const,
    costDetail: (targetType: string, targetId: number) => ['cost', 'detail', targetType, targetId] as const,
    costCompare: (cityId: number) => ['cost', 'compare', cityId] as const,
  },
  flight: {
    all: ['flight'] as const,
    citySummary: (cityId: number, yearMonth: string) =>
      ['flight', 'city-summary', cityId, yearMonth] as const,
    calendar: (cityId: number, yearMonth: string) =>
      ['flight', 'calendar', cityId, yearMonth] as const,
    trend: (cityId: number) => ['flight', 'trend', cityId] as const,
  },
  news: {
    byCountry: (countryId: number) => ['news', countryId] as const,
  },
  bookmark: {
    all: ['bookmark'] as const,
    list: (keyword?: string, page?: number, size?: number) => ['bookmark', 'list', keyword, page, size] as const,
    detail: (id: number) => ['bookmark', 'detail', id] as const,
  },
} as const;
