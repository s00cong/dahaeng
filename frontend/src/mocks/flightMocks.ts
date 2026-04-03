/**
 * 항공권 탐색 탭 더미 데이터
 *
 * 서버 연결 방법:
 *   flight.api.ts 상단의 `USE_MOCK_FLIGHT_API` 를 false 로 변경하면 실제 API를 사용합니다.
 */
import dayjs from '@/utils/dayjs';
import type { CitySummary, FlightCalendar, FlightTrend } from '@/schemas/flight.schema';

const now = dayjs();

function randomPrice(base: number, variance: number) {
  return Math.round((base + (Math.random() - 0.5) * variance) / 1000) * 1000;
}

// 도시 요약 (GET /api/cities/{cityId}/summary)
export function getMockCitySummary(_cityId: number, _yearMonth: string): CitySummary {
  return {
    city_id: _cityId,
    city_name_kr: '도쿄',
    city_name_en: 'Tokyo',
    country_name_kr: '일본',
    city_image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    avg_flight_price: 240000,
    avg_hotel_price: 180000,
    typical_stops_text: '직항',
    min_duration_text: '2시간 30분',
    peak_season_months: [3, 11, 12],
    off_season_months: [4, 5, 6, 7],
  };
}

// 캘린더 일별 가격 + 날짜별 히스토리 (GET /api/flights/calendar/{cityId})
export function getMockFlightCalendar(_cityId: number, yearMonth: string): FlightCalendar {
  const base = dayjs(yearMonth + '-01');
  const days = base.daysInMonth();

  // 오늘(0)부터 14일 전(14)까지 15일 연속 생성
  // 과거로 갈수록 가격이 높았던 경향(= 최근에 저렴해짐)에 랜덤 등락 추가
  const makeHistory = (basePrice: number) =>
    Array.from({ length: 15 }, (_, i) => {
      const label =
        i === 0 ? '오늘' :
        i === 1 ? '어제' :
        i === 2 ? '그제' :
        `${i}일 전`;
      // 하루 평균 1,500 ~ 3,000원씩 과거가 높고, ±5,000 랜덤 진동
      const pastPremium = Math.round(i * 2200 + (Math.random() - 0.4) * 8000);
      return {
        collected_date: now.subtract(i, 'day').format('YYYY-MM-DD'),
        price: Math.max(50000, Math.round((basePrice + pastPremium) / 1000) * 1000),
        label,
      };
    });

  return {
    city_id: _cityId,
    year_month: yearMonth,
    updated_at: now.toISOString(),
    outbound_daily_prices: Array.from({ length: days }, (_, i) => {
      const price = randomPrice(220000, 60000);
      return {
        date: base.add(i, 'day').format('YYYY-MM-DD'),
        price,
        history: makeHistory(price),
      };
    }),
    inbound_daily_prices: Array.from({ length: days }, (_, i) => {
      const price = randomPrice(230000, 60000);
      return {
        date: base.add(i, 'day').format('YYYY-MM-DD'),
        price,
        history: makeHistory(price),
      };
    }),
  };
}

// 6개월 월별 추이 (GET /api/flights/trend/{cityId})
export function getMockFlightTrend(_cityId: number): FlightTrend {
  return {
    city_id: _cityId,
    trend_data: Array.from({ length: 6 }, (_, i) => ({
      year_month: now.add(i, 'month').format('YYYY-MM'),
      avg_flight_price: randomPrice(240000, 80000),
      avg_hotel_price: randomPrice(180000, 40000),
    })),
  };
}
