import { axiosInstance } from './axiosInstance';
import { CountryNewsSchema, type CountryNews } from '@/schemas/news.schema';
import { getMockCountryNews } from '@/mocks/newsMocks';

/**
 * 서버 구현 완료 시 false 로 변경하면 실제 API가 호출됩니다.
 */
const USE_MOCK_NEWS_API = true;

export const newsApi = {
  // GET /api/news/{countryId}
  // cityId를 임시 키로 사용 (백엔드 연동 시 countryId로 교체)
  getNewsByCityId: async (cityId: number): Promise<CountryNews> => {
    if (USE_MOCK_NEWS_API) return getMockCountryNews(cityId);
    const { data } = await axiosInstance.get(`/api/news/${cityId}`);
    return CountryNewsSchema.parse(data);
  },
};
