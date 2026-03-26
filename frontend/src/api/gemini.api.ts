import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { NearbyAttractionFeature } from './nearbyAttractions.api';
import type { CityDetail } from '@/schemas/city.schema';

// ── 응답 스키마 (Zod — 파싱 전용) ─────────────────────────────────────────────

const attractionInCourseSchema = z.object({
  name: z.string(),
  order: z.number(),
  description: z.string(),
  tip: z.string(),
  stayMinutes: z.number(),
  visitTime: z.string(),
  lat: z.number(),
  lon: z.number(),
});

export const travelCourseSchema = z.object({
  courseTitle: z.string(),
  attractions: z.array(attractionInCourseSchema),
});

export const travelCoursesSchema = z.object({
  courses: z.array(travelCourseSchema),
});

export type TravelCourse = z.infer<typeof travelCourseSchema>;
export type TravelCourses = z.infer<typeof travelCoursesSchema>;

// ── JSON 스키마 (Gemini responseJsonSchema용) ─────────────────────────────────

const attractionItemSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Exact name from the input list' },
    order: { type: 'number', description: 'Visit order starting from 1' },
    description: { type: 'string', description: 'One short Korean sentence describing this attraction' },
    tip: { type: 'string', description: 'One short Korean sentence about what visitors can enjoy or do here (e.g. 전망대에서 야경 감상하기, 현지 길거리 음식 맛보기)' },
    stayMinutes: { type: 'number', description: 'Suggested stay duration in minutes' },
    visitTime: { type: 'string', description: 'Recommended visit time range in Korean (e.g. 09:00 ~ 10:30)' },
    lat: { type: 'number' },
    lon: { type: 'number' },
  },
  required: ['name', 'order', 'description', 'tip', 'stayMinutes', 'visitTime', 'lat', 'lon'],
};

const TRAVEL_COURSES_JSON_SCHEMA = {
  type: 'object',
  properties: {
    courses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          courseTitle: { type: 'string', description: 'Course title in Korean matching user interest themes (e.g. 활기찬 나이트라이프 코스, 친구와 함께하는 코스)' },
          attractions: { type: 'array', items: attractionItemSchema },
        },
        required: ['courseTitle', 'attractions'],
      },
    },
  },
  required: ['courses'],
};

// ── API 호출 ──────────────────────────────────────────────────────────────────

export async function generateTravelCourses(
  features: NearbyAttractionFeature[],
  cityNameKo: string,
  touristSpots?: NonNullable<CityDetail['touristSpot']>,
  cityTags?: NonNullable<CityDetail['tags']>,
): Promise<TravelCourses> {
  const apiKey = 'AIzaSyCsVfoWZyTQzt_WOmZrkCfcx2MBxNS2ceI';
  const ai = new GoogleGenAI({ apiKey });

  const spots = features.slice(0, 20).map((f) => ({
    name: f.properties.nameKo ?? f.properties.nameEn ?? f.properties.name,
    lat: f.properties.lat,
    lon: f.properties.lon,
    category: f.properties.categories?.[0] ?? '',
  }));

  // AI 추천 관광지: tags 정보 포함
  const aiSpots = touristSpots
    ?.filter((s) => s.lat != null && s.lon != null)
    .map((s) => ({
      name: s.name,
      lat: s.lat!,
      lon: s.lon!,
      tags: s.tags?.map((t) => t.name) ?? [],
      score: s.spotScore != null ? Math.round(s.spotScore * 100) : undefined,
    })) ?? [];

  const allSpots = [
    ...aiSpots,
    ...spots.filter((s) => !aiSpots.some((a) => a.name === s.name)),
  ];

  // 사용자 관심 태그 (점수 내림차순 상위 5개)
  const topTags = (cityTags ?? [])
    .filter((t) => t.tagScore != null)
    .sort((a, b) => (b.tagScore ?? 0) - (a.tagScore ?? 0))
    .slice(0, 5)
    .map((t) => `${t.name}(관심도 ${Math.round((t.tagScore ?? 0) * 100)}%)`);

  const tagSection = topTags.length > 0
    ? `\n사용자 관심 태그 (관심도 높은 순): ${topTags.join(', ')}\n이 관심 태그를 반영하여 코스 테마를 정해주세요. 예를 들어 #활기찬 태그가 높으면 활기찬 테마 코스, #친구와 태그가 높으면 친구와 함께하는 테마 코스 등으로 구성하세요.\n`
    : '';

  const prompt = `
다음은 ${cityNameKo}의 관광지 목록입니다.
서로 다른 테마의 하루 여행 코스 3개를 추천해 주세요.
각 코스는 5~7곳으로 구성하고, lat/lon 좌표를 참고하여 동선이 효율적이도록 순서를 정해주세요.
각 관광지에 한 문장의 간단한 한국어 설명(description)을 달아주세요.
각 관광지에서 방문객이 즐길 수 있는 활동이나 추천 행동을 한 문장으로 tip 필드에 적어주세요 (예: 전망대에서 야경 감상하기, 현지 길거리 음식 맛보기).
각 관광지의 권장 방문 시간대를 visitTime으로 알려주세요 (예: 09:00 ~ 10:30). 코스 전체가 하루 일정이 되도록 연속된 시간으로 구성하세요.
${tagSection}
관광지 목록 (tags: 장소 특성 태그, score: 추천 점수):
${JSON.stringify(allSpots)}

반드시 입력된 관광지 중에서만 선택하고, lat/lon은 입력값 그대로 사용하세요.
`.trim();

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: TRAVEL_COURSES_JSON_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  return travelCoursesSchema.parse(JSON.parse(response.text ?? ''));
}
