import { useMemo } from "react";
import { useInterestAnalysis } from "@/hooks/youtube/useInterestAnalysis";
import { useMemberTags } from "@/hooks/auth/useMemberTags";
import { useTagList } from "@/hooks/tag/useTagList";
import { useUiStore } from "@/stores/uiStore";

/**
 * 도시 태그 표시 로직:
 * - 추천 X: tagScore > 0.5인 태그 중 top 5
 * - 추천 O:
 *   - top 3 항상 표시
 *   - 유튜브 분석 태그와 매칭되는 도시 태그: 무조건 표시
 *   - 사용자 직접 입력 태그와 매칭되는 도시 태그: tagScore > 0.6일 때만 표시
 *   (모두 tagScore > 0.5 필터 통과한 것에서)
 */
export function useDisplayCityTags(
  cityTags: { name: string; tagScore?: number | null }[] | undefined,
) {
  const { isRecommendActive } = useUiStore();
  const { data: analysis } = useInterestAnalysis();
  const { data: memberTags } = useMemberTags();
  const { data: tagList } = useTagList();

  return useMemo(() => {
    if (!cityTags || cityTags.length === 0) return [];

    const sorted = [...cityTags]
      .filter((t) => (t.tagScore ?? 0) > 0.5)
      .sort((a, b) => (b.tagScore ?? 0) - (a.tagScore ?? 0));

    if (!isRecommendActive) return sorted.slice(0, 5);

    const top3 = sorted.slice(0, 3);
    const top3Names = new Set(top3.map((t) => t.name));
    const cityTagMap = new Map(sorted.map((t) => [t.name, t]));

    // 유튜브 분석 태그와 매칭되는 도시 태그 (무조건 표시)
    const youtubeAnalysisTagNames = new Set((analysis?.tags ?? []).map((t) => t.tagName));
    const analysisMatchedNames = new Set(
      (analysis?.tags ?? [])
        .filter((t) => t.tagId != null && cityTagMap.has(t.tagName))
        .map((t) => t.tagName),
    );

    // 사용자 직접 입력 태그와 매칭되는 도시 태그 (tagScore > 0.6만)
    const tagMap = new Map((tagList ?? []).map((t) => [t.tagId, t]));
    const memberMatchedNames = new Set(
      (memberTags ?? [])
        .filter((mt) => !mt.isFromYoutube)
        .map((mt) => tagMap.get(mt.tagId))
        .filter(
          (t): t is NonNullable<typeof t> =>
            t != null &&
            !youtubeAnalysisTagNames.has(t.tagName) &&
            cityTagMap.has(t.tagName) &&
            (cityTagMap.get(t.tagName)!.tagScore ?? 0) > 0.6,
        )
        .map((t) => t.tagName),
    );

    const result = [...top3];
    const resultNames = new Set(top3Names);

    for (const name of [...analysisMatchedNames, ...memberMatchedNames]) {
      if (!resultNames.has(name) && cityTagMap.has(name)) {
        result.push(cityTagMap.get(name)!);
        resultNames.add(name);
      }
    }

    return result;
  }, [cityTags, isRecommendActive, analysis, memberTags, tagList]);
}
