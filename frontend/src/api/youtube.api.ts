import { axiosInstance } from './axiosInstance';
import { z } from 'zod';

const InterestTagSchema = z.object({
  tagId: z.number(),
  categoryName: z.string(),
  tagName: z.string(),
});

export const youtubeApi = {
  // POST /api/youtube/sync — YouTube 데이터 동기화 + 키워드 추출
  sync: async () => {
    await axiosInstance.post('/api/youtube/sync', null, { timeout: 120_000 });
  },

  // POST /api/interest/analyze — AI 태그 추론 + DB 저장
  analyze: async () => {
    await axiosInstance.post('/api/interest/analyze', null, { timeout: 120_000 });
  },

  // GET /api/interest/analyze — 저장된 여행 태그 목록 조회
  getInterestTags: async (): Promise<{ tagIds: number[]; tagNames: string[] }> => {
    const { data } = await axiosInstance.get('/api/interest/analyze');
    const tags = z.array(InterestTagSchema).parse(data);
    return {
      tagIds: tags.map((t) => t.tagId),
      tagNames: tags.map((t) => t.tagName),
    };
  },
};
