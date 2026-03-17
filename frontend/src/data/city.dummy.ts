import type { CityDetail, NewsItem } from '@/schemas/city.schema';

// News API 키가 없거나 응답이 비어있을 때 사용하는 더미 뉴스
export const DUMMY_NEWS_ARTICLES: NewsItem[] = [
  {
    title: '여행자들이 선택한 2026 인기 여행지 TOP 10',
    url: 'https://example.com/travel-top10-2026',
    description: '올해 가장 많은 여행자들이 찾은 도시들을 분석했습니다. 물가, 안전, 볼거리 등 종합 평가 결과입니다.',
    urlToImage: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
    publishedAt: '2026-03-15T09:00:00Z',
  },
  {
    title: '봄 여행 시즌, 항공권 최저가 예약 팁',
    url: 'https://example.com/flight-tip-spring-2026',
    description: '봄 성수기 항공권을 저렴하게 예약하는 방법과 최적 예약 시기를 안내합니다.',
    urlToImage: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400',
    publishedAt: '2026-03-10T12:00:00Z',
  },
  {
    title: '2026 해외여행 환전 가이드 — 언제, 어디서 환전할까',
    url: 'https://example.com/exchange-guide-2026',
    description: '해외여행 전 알아두면 좋은 환전 방법과 수수료 절약 팁을 정리했습니다.',
    urlToImage: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=400',
    publishedAt: '2026-03-05T08:00:00Z',
  },
];

// GET /api/city/{id}?recommend=true 더미
// 외부 API(News API, OpenAI, Google Places)가 없는 개발 환경에서 폴백으로 사용
export const DUMMY_CITY_DETAIL_RECOMMEND: CityDetail = {
  cityId: 120,
  cityName: 'Tokyo',
  countryId: 10,
  countryName: 'Japan',
  imgUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
  latitude: 35.6762,
  longitude: 139.6503,
  score: {
    finalScore: 82,
    budgetScore: 20,
    safetyScore: 15,
    tagMatchScore: 52,
    newPenaltyScore: -5,
  },
  recommendationReason:
    '도쿄는 예산 대비 만족도가 높은 여행지입니다. 대중교통이 잘 발달되어 있어 이동이 편리하며, 다양한 음식과 문화 체험이 가능합니다. 선택하신 태그와 높은 매칭도를 보여 추천 도시 1위에 선정되었습니다.',
  livingCostFor1Day: {
    food: 15000,
    transportation: 5000,
    accommodation: 80000,
  },
  airTicketAndHotel: {
    airTicket: 420000,
    hotel: 80000,
  },
  exchangeRate: {
    currency: 'JPY',
    krwPerDisplayUnit: 909,
    displayUnit: 100,
    displaySymbol: 'JPY(100)',
    eventDate: '2026-03-17',
  },
  news: {
    summation:
      '도쿄는 최근 벚꽃 시즌을 맞아 관광객이 급증하고 있으며, 새로운 레스토랑과 문화 행사가 풍성하게 열리고 있습니다. 전반적으로 안전하고 여행하기 좋은 환경이 유지되고 있습니다.',
    top3: [
      {
        title: 'Tokyo Cherry Blossom 2026: Best Viewing Spots',
        url: 'https://example.com/tokyo-sakura-2026',
        description: 'A guide to the best cherry blossom viewing spots in Tokyo this spring.',
        urlToImage: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400',
        publishedAt: '2026-03-15T09:00:00Z',
      },
      {
        title: 'New Michelin Restaurants Open in Shibuya',
        url: 'https://example.com/shibuya-michelin-2026',
        description: 'Several new Michelin-starred restaurants have opened in Shibuya this season.',
        urlToImage: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400',
        publishedAt: '2026-03-10T12:00:00Z',
      },
      {
        title: 'Tokyo Tourism Sets New Record in Q1 2026',
        url: 'https://example.com/tokyo-tourism-record',
        description: 'Tokyo welcomed over 3 million international visitors in Q1 2026.',
        urlToImage: 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=400',
        publishedAt: '2026-03-05T08:00:00Z',
      },
    ],
  },
  danger: {
    countryName: 'Japan',
    items: [
      { level: '여행유의', description: '지진 및 자연재해 대비 필요' },
    ],
  },
  tags: [
    { name: '도시여행', tagScore: 0.95 },
    { name: '음식', tagScore: 0.92 },
    { name: '문화', tagScore: 0.88 },
    { name: '쇼핑', tagScore: 0.85 },
    { name: '역사', tagScore: 0.80 },
  ],
  touristSpot: [
    {
      name: '아사쿠사 센소지',
      description: '도쿄에서 가장 오래된 사원으로, 화려한 나카미세 상점가와 함께 전통 일본 문화를 체험할 수 있는 곳입니다.',
      lat: 35.7148,
      lon: 139.7967,
      imageUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800',
      spotScore: 4.8,
      tags: [{ name: '문화', tagScore: 0.95 }, { name: '역사', tagScore: 0.90 }],
    },
    {
      name: '신주쿠 교엔',
      description: '도심 속 광대한 공원으로 벚꽃 명소로 유명합니다. 프랑스식·영국식·일본식 정원이 조화를 이루고 있습니다.',
      lat: 35.6852,
      lon: 139.7100,
      imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800',
      spotScore: 4.6,
      tags: [{ name: '자연', tagScore: 0.88 }, { name: '힐링', tagScore: 0.85 }],
    },
    {
      name: '도쿄 스카이트리',
      description: '높이 634m의 세계 최고 수준 전파탑으로, 전망대에서 도쿄 전경을 한눈에 조망할 수 있습니다.',
      lat: 35.7101,
      lon: 139.8107,
      imageUrl: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800',
      spotScore: 4.5,
      tags: [{ name: '랜드마크', tagScore: 0.92 }, { name: '도시여행', tagScore: 0.88 }],
    },
    {
      name: '시부야 스크램블 교차로',
      description: '세계에서 가장 바쁜 교차로 중 하나로, 도쿄 현대 문화의 상징적인 장소입니다.',
      lat: 35.6595,
      lon: 139.7004,
      imageUrl: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800',
      spotScore: 4.4,
      tags: [{ name: '도시여행', tagScore: 0.90 }, { name: '쇼핑', tagScore: 0.85 }],
    },
    {
      name: '우에노 공원',
      description: '도쿄 최대의 공원으로 국립박물관, 동물원, 미술관이 모여 있는 문화 복합 공간입니다.',
      lat: 35.7155,
      lon: 139.7739,
      imageUrl: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800',
      spotScore: 4.3,
      tags: [{ name: '문화', tagScore: 0.88 }, { name: '자연', tagScore: 0.82 }],
    },
  ],
};

// GET /api/city/{id}?recommend=false 더미 (외부 API 없음 — 거의 사용 안 해도 됨)
export const DUMMY_CITY_DETAIL_NOT_RECOMMEND: CityDetail = {
  cityId: 120,
  cityName: 'Tokyo',
  countryId: 10,
  countryName: 'Japan',
  imgUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
  latitude: 35.6762,
  longitude: 139.6503,
  livingCostFor1Day: {
    food: 15000,
    transportation: 5000,
  },
  airTicketAndHotel: {
    airTicket: 420000,
    hotel: 80000,
  },
  exchangeRate: {
    currency: 'JPY',
    krwPerDisplayUnit: 909,
    displayUnit: 100,
    displaySymbol: 'JPY(100)',
    eventDate: '2026-03-17',
  },
  danger: {
    countryName: 'Japan',
    items: [{ level: '여행유의', description: '지진 및 자연재해 대비 필요' }],
  },
  tags: [
    { name: '도시여행', tagScore: 0.95 },
    { name: '음식', tagScore: 0.92 },
    { name: '문화', tagScore: 0.88 },
  ],
};
