import { axiosInstance } from "./axiosInstance";
import { z } from "zod";

const EvidenceKeywordSchema = z.object({
  keyword: z.string(),
  sourceType: z.string(),
  score: z.number(),
});

const SourceBadgeSchema = z.object({
  sourceType: z.string(),
  percent: z.number(),
});

const TopKeywordSchema = z.object({
  keyword: z.string(),
  normalizedKeyword: z.string(),
  sourceType: z.string(),
  score: z.number(),
});

export const InterestTagSchema = z.object({
  tagId: z.number().nullish(),
  categoryName: z.string(),
  tagName: z.string(),
  score: z.number().optional(),
  confidence: z.number().optional(),
  reason: z.string().optional(),
  evidenceKeywords: z.array(EvidenceKeywordSchema).optional().default([]),
  sourceBadges: z.array(SourceBadgeSchema).optional().default([]),
});

export type InterestTag = z.infer<typeof InterestTagSchema>;
export type EvidenceKeyword = z.infer<typeof EvidenceKeywordSchema>;
export type SourceBadge = z.infer<typeof SourceBadgeSchema>;
export type TopKeyword = z.infer<typeof TopKeywordSchema>;

const InterestAnalyzeResponseSchema = z.object({
  tags: z.array(InterestTagSchema),
  topKeywords: z.array(TopKeywordSchema).optional().default([]),
});

export type InterestAnalyzeResponse = z.infer<typeof InterestAnalyzeResponseSchema>;

export const youtubeApi = {
  // POST /api/youtube/sync — YouTube 데이터 동기화 + 키워드 추출
  sync: async () => {
    await axiosInstance.post("/api/youtube/sync", null, { timeout: 120_000 });
  },

  // POST /api/interest/analyze — AI 태그 추론 + DB 저장
  analyze: async () => {
    await axiosInstance.post("/api/interest/analyze", null, {
      timeout: 120_000,
    });
  },

  // GET /api/interest/analyze — 저장된 여행 태그 목록 + 풀 분석 데이터 조회
  getInterestTags: async (): Promise<{
    tagIds: number[];
    tagNames: string[];
  }> => {
    const { data } = await axiosInstance.get("/api/interest/analyze");
    const parsed = InterestAnalyzeResponseSchema.safeParse(data);
    const tags = parsed.success ? parsed.data.tags : z.array(InterestTagSchema).parse(data);
    const validTags = tags.filter((t) => t.tagId != null);
    return {
      tagIds: validTags.map((t) => t.tagId!),
      tagNames: validTags.map((t) => t.tagName),
    };
  },

  // GET /api/interest/analyze — 풀 분석 데이터 (추천 이유 탭용)
  getInterestAnalysis: async (): Promise<InterestAnalyzeResponse> => {
    const { data } = await axiosInstance.get("/api/interest/analyze");
    const parsed = InterestAnalyzeResponseSchema.safeParse(data);
    if (parsed.success) return parsed.data;
    // 배열로 오는 경우 fallback
    const tags = z.array(InterestTagSchema).parse(data);
    return { tags, topKeywords: [] };
  },
};
