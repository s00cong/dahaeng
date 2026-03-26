import { axiosInstance } from './axiosInstance';
import {
  CitySummarySchema,
  FlightCalendarSchema,
  FlightTrendSchema,
  type CitySummary,
  type FlightCalendar,
  type FlightTrend,
} from '@/schemas/flight.schema';
import {
  getMockCitySummary,
  getMockFlightCalendar,
  getMockFlightTrend,
} from '@/mocks/flightMocks';

const USE_MOCK_FLIGHT_API = false;

// 수집 날짜 → "오늘" / "어제" / "그제" / "N일 전" 레이블 계산
function computeLabel(collectedDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const collected = new Date(collectedDate);
  collected.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - collected.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '어제';
  if (diffDays === 2) return '그제';
  return `${diffDays}일 전`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformDailyPrice(d: any) {
  return {
    date: d.date,
    price: d.price,
    history: (d.history ?? []).map((h: { collectedDate: string; price: number }) => ({
      collected_date: h.collectedDate,
      price: h.price,
      label: computeLabel(h.collectedDate),
    })),
  };
}

export const flightApi = {
  // GET /api/cities/{cityId}/summary?year_month=YYYY-MM
  getCitySummary: async (cityId: number, yearMonth: string): Promise<CitySummary> => {
    if (USE_MOCK_FLIGHT_API) return getMockCitySummary(cityId, yearMonth);
    const { data } = await axiosInstance.get(`/api/cities/${cityId}/summary`, {
      params: { year_month: yearMonth },
    });
    return CitySummarySchema.parse({
      city_id: data.cityId,
      city_name_kr: data.cityNameKr,
      city_name_en: data.cityNameEn,
      country_name_kr: data.countryNameKr,
      city_image_url: data.cityImageUrl,
      avg_flight_price: data.avgFlightPrice,
      avg_hotel_price: data.avgHotelPrice,
      typical_stops_text: data.typicalStopsText,
      min_duration_text: data.minDurationText || data.avgDurationText,
      peak_season_months: data.peakSeasonMonths,
      off_season_months: data.offSeasonMonths,
    });
  },

  // GET /api/flights/calendar/{cityId}?year_month=YYYY-MM
  getFlightCalendar: async (cityId: number, yearMonth: string): Promise<FlightCalendar> => {
    if (USE_MOCK_FLIGHT_API) return getMockFlightCalendar(cityId, yearMonth);
    const { data } = await axiosInstance.get(`/api/flights/calendar/${cityId}`, {
      params: { year_month: yearMonth },
    });
    return FlightCalendarSchema.parse({
      city_id: data.cityId,
      year_month: data.yearMonth,
      updated_at: data.updatedAt,
      outbound_daily_prices: (data.outboundDailyPrices ?? []).map(transformDailyPrice),
      inbound_daily_prices: (data.inboundDailyPrices ?? []).map(transformDailyPrice),
    });
  },

  // GET /api/flights/trend/{cityId}
  getFlightTrend: async (cityId: number): Promise<FlightTrend> => {
    if (USE_MOCK_FLIGHT_API) return getMockFlightTrend(cityId);
    const { data } = await axiosInstance.get(`/api/flights/trend/${cityId}`);
    return FlightTrendSchema.parse({
      city_id: data.cityId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trend_data: (data.trendData ?? []).map((t: any) => ({
        year_month: t.yearMonth,
        avg_flight_price: t.avgFlightPrice,
        avg_hotel_price: t.avgHotelPrice,
      })),
    });
  },
};
