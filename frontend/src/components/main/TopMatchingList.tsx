import { useMemo } from "react";
import { MapPin, Loader2, RefreshCw, SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCityList } from "@/hooks/city/useCityList";
import { useUiStore } from "@/stores/uiStore";
import { TopMatchingCard } from "./TopMatchingCard";
import { cn } from "@/lib/utils";
import type { CityListItem } from "@/schemas/city.schema";

const TOP_N = 5;

export function TopMatchingList() {
  const { data: citiesFromApi, isLoading } = useCityList();
  const { isRecommendActive, isRecommendLoading, recommendResults } = useUiStore();

  const cities = citiesFromApi ?? [];

  const topCities = useMemo((): CityListItem[] => {
    if (isRecommendActive && recommendResults.length > 0) {
      return recommendResults.slice(0, TOP_N).map((r) => {
        const matched = cities.find((c) => c.cityName === r.city);
        return matched
          ? { ...matched, matchingScore: r.totalScore > 0 ? r.totalScore : undefined }
          : {
              cityId: r.rank,
              cityName: r.city,
              countryName: r.country,
              imgUrl: "",
              estimatedBudget: 0,
              riskLevel: 1,
              latitude: 0,
              longitude: 0,
              matchingScore: r.totalScore > 0 ? r.totalScore : undefined,
            };
      });
    }
    return [];
  }, [cities, recommendResults, isRecommendActive]);

  return (
    <section
      className={cn(
        "bg-white/85 backdrop-blur-md rounded-2xl shadow-lg p-4",
        "flex flex-col gap-2 flex-1 min-h-0",
      )}
      aria-label="최고의 매칭 여행지"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-blue-500" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            최고의 매칭 여행지
          </h2>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          TOP {TOP_N}
        </span>
      </div>

      {/* 도시 목록 로딩 스켈레톤 */}
      {isLoading && (
        <div
          className="flex flex-col gap-2"
          role="status"
          aria-label="목록 불러오는 중"
        >
          {Array.from({ length: TOP_N }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* 추천 API 로딩 중 */}
      {!isLoading && isRecommendLoading && (
        <div
          className="flex flex-col items-center justify-center flex-1 gap-3 py-6"
          role="status"
          aria-label="추천 계산 중"
        >
          <Loader2 className="size-8 text-blue-400 animate-spin" />
          <p className="text-xs font-medium text-slate-600">추천 여행지 계산 중...</p>
          <p className="text-[10px] text-slate-400">잠시만 기다려 주세요</p>
        </div>
      )}

      {/* 추천 전 안내 메시지 */}
      {!isLoading && !isRecommendLoading && !isRecommendActive && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-6 text-center">
          <RefreshCw className="size-8 text-slate-300" aria-hidden="true" />
          <p className="text-xs font-medium text-slate-600">
            아직 추천 결과가 없어요
          </p>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            여행 설정을 입력하고<br />추천 업데이트를 눌러주세요
          </p>
        </div>
      )}

      {/* 추천 결과 없음 */}
      {!isLoading && !isRecommendLoading && isRecommendActive && topCities.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-6 text-center">
          <SearchX className="size-8 text-slate-300" aria-hidden="true" />
          <p className="text-xs font-medium text-slate-600">
            추천된 도시가 없습니다
          </p>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            설정을 변경하고<br />다시 추천해주세요
          </p>
        </div>
      )}

      {/* 목록 */}
      {!isLoading && !isRecommendLoading && isRecommendActive && topCities.length > 0 && (
        <ul className="flex flex-col overflow-y-auto flex-1" role="list">
          {topCities.map((city, index) => (
            <li key={city.cityId} role="listitem">
              <TopMatchingCard city={city} rank={index + 1} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
