import type { CityDetail, CityListItem } from "@/schemas/city.schema";

/**
 * 백엔드 없이 UI 확인용 더미 도시 상세 데이터
 * 백엔드 RecommendCityDetailResponse 구조에 맞춤
 */
export const DUMMY_CITY_DETAILS: Record<number, CityDetail> = {
  1: {
    cityId: 1,
    cityName: "도쿄",
    countryId: 1,
    countryName: "일본",
    imgUrl: "https://picsum.photos/seed/tokyo/800/1200",
    latitude: 35.6762,
    longitude: 139.6503,
    score: {
      finalScore: 92,
      budgetScore: 85,
      safetyScore: 95,
      tagMatchScore: 90,
      newPenaltyScore: -5,
    },
    recommendationReason:
      "일본 특유의 현대와 전통이 공존하는 문화, 안전한 치안, 다양한 미식 경험이 당신의 여행 스타일과 92% 일치합니다.",
    tags: [
      { name: "미식", tagScore: 90 },
      { name: "전통문화", tagScore: 85 },
      { name: "쇼핑", tagScore: 80 },
      { name: "야경", tagScore: 88 },
      { name: "애니메이션", tagScore: 75 },
    ],
    danger: {
      countryName: "일본",
      items: [{ level: "유의", description: "일부 번화가 호객 행위 주의" }],
    },
    livingCostFor1Day: {
      food: 45000,
      transportation: 10000,
    },
    airTicketAndHotel: {
      airTicket: 160000,
      hotel: 65000,
    },
    news: {
      summation: "벚꽃 개화 시기가 예년보다 빨라져 관광객이 급증하고 있으며, 주요 명소 예약이 필수적입니다.",
      top3: [
        {
          title: "도쿄 벚꽃 축제 개막 소식",
          url: "https://example.com/tokyo-sakura",
          publishedAt: "2026-03-09T10:00:00Z",
        },
        {
          title: "시부야 스카이 입장권 매진 행렬",
          url: "https://example.com/shibuya-sky",
          publishedAt: "2026-03-08T15:30:00Z",
        },
        {
          title: "신규 오픈한 해리포터 스튜디오 가이드",
          url: "https://example.com/warner-bros-tokyo",
          publishedAt: "2026-03-07T09:00:00Z",
        },
      ],
    },
    touristSpot: [
      { name: "센소지", description: "도쿄 최고의 불교 사원", lat: 35.7148, lon: 139.7967, imageUrl: null },
      { name: "시부야 스크램블", description: "세계에서 가장 바쁜 교차로", lat: 35.6598, lon: 139.7004, imageUrl: null },
    ],
  },
  2: {
    cityId: 2,
    cityName: "파리",
    countryId: 2,
    countryName: "프랑스",
    imgUrl: "https://picsum.photos/seed/paris/800/1200",
    latitude: 48.8566,
    longitude: 2.3522,
    score: {
      finalScore: 85,
      budgetScore: 70,
      safetyScore: 80,
      tagMatchScore: 92,
      newPenaltyScore: -3,
    },
    recommendationReason:
      "세계 예술과 패션의 중심지 파리는 루브르 박물관, 에펠탑 등 문화 콘텐츠가 풍부해 당신의 문화/역사 취향과 85% 매칭됩니다.",
    tags: [
      { name: "예술", tagScore: 95 },
      { name: "패션", tagScore: 90 },
      { name: "낭만", tagScore: 92 },
      { name: "역사", tagScore: 88 },
    ],
    danger: {
      countryName: "프랑스",
      items: [{ level: "주의", description: "소매치기 및 분실물 주의 (에펠탑 인근)" }],
    },
    livingCostFor1Day: {
      food: 70000,
      transportation: 15000,
    },
    airTicketAndHotel: {
      airTicket: 420000,
      hotel: 120000,
    },
    news: {
      summation: "올림픽 준비로 인한 일부 지하철 노선 공사 중입니다.",
      top3: [
        {
          title: "파리 루브르 박물관 야간 개장 안내",
          url: "https://example.com/louvre",
          publishedAt: "2026-03-05T10:00:00Z",
        },
      ],
    },
  },
  10: {
    cityId: 10,
    cityName: "발리",
    countryId: 10,
    countryName: "인도네시아",
    imgUrl: "https://picsum.photos/seed/bali/800/1200",
    latitude: -8.3405,
    longitude: 115.092,
    score: {
      finalScore: 95,
      budgetScore: 98,
      safetyScore: 80,
      tagMatchScore: 96,
      newPenaltyScore: -2,
    },
    recommendationReason:
      "신들의 섬 발리는 우붓의 라이스 테라스, 꾸따 해변의 서핑, 합리적인 물가가 당신의 자연/경관 취향과 95% 완벽하게 매칭됩니다.",
    tags: [
      { name: "해변", tagScore: 95 },
      { name: "서핑", tagScore: 88 },
      { name: "힐링", tagScore: 92 },
      { name: "사원", tagScore: 85 },
      { name: "저물가", tagScore: 98 },
      { name: "휴양", tagScore: 90 },
    ],
    danger: {
      countryName: "인도네시아",
      items: [{ level: "유의", description: "환전 시 공식 환전소 이용 권장" }],
    },
    livingCostFor1Day: {
      food: 20000,
      transportation: 15000,
    },
    airTicketAndHotel: {
      airTicket: 210000,
      hotel: 35000,
    },
    news: {
      summation: "디지털 노마드를 위한 신규 비자 정책이 발표되어 장기 체류 여행객이 늘고 있습니다.",
      top3: [
        { title: "발리 우붓 요가 페스티벌 일정", url: "https://example.com/bali-yoga", publishedAt: "2026-03-01T10:00:00Z" },
        { title: "짱구 지역 교통 체증 심화 주의", url: "https://example.com/canggu-traffic", publishedAt: "2026-02-28T10:00:00Z" },
      ],
    },
  },
  12: {
    cityId: 12,
    cityName: "서울",
    countryId: 12,
    countryName: "한국",
    imgUrl: "https://picsum.photos/seed/seoul/800/1200",
    latitude: 37.5665,
    longitude: 126.978,
    score: {
      finalScore: 87,
      budgetScore: 80,
      safetyScore: 95,
      tagMatchScore: 88,
      newPenaltyScore: 0,
    },
    recommendationReason:
      "경복궁과 남산, K-팝과 K-뷰티, 홍대와 강남의 쇼핑까지 전통과 트렌드가 공존하는 서울은 도시/쇼핑 취향과 87% 매칭됩니다.",
    tags: [
      { name: "K팝", tagScore: 90 },
      { name: "쇼핑", tagScore: 88 },
      { name: "미식", tagScore: 85 },
      { name: "야경", tagScore: 82 },
    ],
    danger: {
      countryName: "한국",
      items: [],
    },
    livingCostFor1Day: {
      food: 40000,
      transportation: 10000,
    },
    airTicketAndHotel: {
      airTicket: 0,
      hotel: 80000,
    },
    news: {
      summation: "서울 페스타 준비로 광화문 일대 행사가 진행 중입니다.",
      top3: [
        { title: "서울 야경 명소 TOP 5", url: "https://example.com/seoul-night", publishedAt: "2026-03-09T10:00:00Z" },
      ],
    },
  },
};

// 나머지 도시들을 위한 기본 객체 생성 함수
const createDefaultCity = (id: number, name: string, country: string): CityDetail => ({
  cityId: id,
  cityName: name,
  countryId: id,
  countryName: country,
  imgUrl: `https://picsum.photos/seed/${id}/800/1200`,
  latitude: 0,
  longitude: 0,
  score: { finalScore: 70 },
  recommendationReason: `${name}은 매력적인 도시입니다.`,
  tags: [{ name: "여행", tagScore: 70 }],
  livingCostFor1Day: { food: 30000, transportation: 10000 },
  airTicketAndHotel: { airTicket: 200000, hotel: 50000 },
  news: { summation: "활기찬 분위기입니다.", top3: [] },
  danger: { countryName: country, items: [] },
});

// 기존 DUMMY_CITY_DETAILS 보완 (누락된 ID들에 대해 기본값 채우기)
[3, 4, 5, 6, 7, 8, 9, 11, 13, 14, 15].forEach((id) => {
  if (!DUMMY_CITY_DETAILS[id]) {
    DUMMY_CITY_DETAILS[id] = createDefaultCity(id, `도시 ${id}`, "국가");
  }
});

const RISK_LEVEL_BY_CITY: Record<number, number> = {
  1: 1, 2: 2, 3: 2, 4: 1, 5: 2, 6: 1, 7: 2, 8: 1, 9: 2, 10: 2, 11: 1, 12: 1, 13: 3, 14: 1, 15: 3,
};

export const DUMMY_CITIES: CityListItem[] = Object.values(DUMMY_CITY_DETAILS).map((d) => ({
  cityId: d.cityId,
  cityName: d.cityName,
  countryName: d.countryName,
  imgUrl: d.imgUrl,
  estimatedBudget: d.airTicketAndHotel
    ? ((d.livingCostFor1Day ? d.livingCostFor1Day.food + d.livingCostFor1Day.transportation : 40000) + d.airTicketAndHotel.hotel) * 7
    : 700000,
  riskLevel: RISK_LEVEL_BY_CITY[d.cityId] ?? 2,
  latitude: d.latitude,
  longitude: d.longitude,
  matchingScore: d.score?.finalScore ?? undefined,
}));
