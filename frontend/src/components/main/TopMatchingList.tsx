import { useMemo, useState, useRef } from "react";
import { MapPin, Loader2, RefreshCw, SearchX, Clock, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { useCityList } from "@/hooks/city/useCityList";
import { useViewHistory } from "@/hooks/city/useViewHistory";
import { useUiStore } from "@/stores/uiStore";
import { useCountryFlagMap } from "@/hooks/country/useCountryFlagMap";
import { TopMatchingCard } from "./TopMatchingCard";
import { cn } from "@/lib/utils";
import { CITY_NAME_KO } from "@/data/cityNameKo";
import { COUNTRY_NAME_KO } from "@/data/countryNameKo";
import type { CityListItem } from "@/schemas/city.schema";
import type { ViewHistoryItem } from "@/api/city.api";
import defaultCityImg from "@/assets/no-picture.png";

const TOP_N = 3;

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

function RecentCityCard({ item, cities }: { item: ViewHistoryItem; cities: CityListItem[] }) {
  const { openRightPanel } = useUiStore();
  const { data: flagMap } = useCountryFlagMap();
  const [imgError, setImgError] = useState(false);

  const cityInfo = cities.find((c) => c.cityId === item.cityId);
  const flagUrl = flagMap?.get(item.countryName);

  const handleClick = () => {
    openRightPanel(item.cityId, item.imgUrl ?? cityInfo?.imgUrl ?? undefined, {
      lat: cityInfo?.latitude ?? 0,
      lng: cityInfo?.longitude ?? 0,
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      className={cn(
        "flex items-center gap-2 p-2.5 rounded-xl cursor-pointer",
        "hover:bg-white/60 transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
      )}
      aria-label={`${item.cityName} 상세 정보 보기`}
    >
      <div className="size-10 rounded-xl overflow-hidden bg-slate-200 shrink-0">
        <img
          src={imgError || !item.imgUrl ? defaultCityImg : item.imgUrl}
          alt={item.cityName}
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-sm font-semibold text-slate-800 truncate">
          {CITY_NAME_KO[item.cityName] ?? item.cityName}
        </span>
        <div className="flex items-center gap-1 min-w-0">
          {flagUrl && (
            <img src={flagUrl} alt="" className="h-3 w-auto rounded-[2px] shrink-0 object-cover" aria-hidden="true" />
          )}
          <span className="text-xs text-slate-500 truncate">
            {COUNTRY_NAME_KO[item.countryName] ?? item.countryName}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-xs font-bold text-slate-700">
          ₩{(item.dailyBudget / 10000).toFixed(0)}만
          <span className="text-[10px] font-normal text-slate-400">/일</span>
        </span>
        <div className="flex items-center gap-0.5 text-[10px] text-slate-400">
          <Clock className="size-2.5" />
          {formatRelativeTime(item.lastViewTime)}
        </div>
      </div>
    </div>
  );
}

type Tab = "matching" | "recent";

const TABS: Tab[] = ["matching", "recent"];

const TAB_META: Record<Tab, { icon: React.ReactNode; label: string; next: Tab; nextLabel: string }> = {
  matching: {
    icon: <MapPin className="size-3.5" />,
    label: "최고의 매칭 여행지",
    next: "recent",
    nextLabel: "최근 여행지",
  },
  recent: {
    icon: <Clock className="size-3.5" />,
    label: "최근 여행지",
    next: "matching",
    nextLabel: "매칭",
  },
};

export function TopMatchingList() {
  const [tab, setTab] = useState<Tab>("matching");
  const dirRef = useRef<1 | -1>(1); // 1 = 오른쪽으로 나가기, -1 = 왼쪽으로 나가기

  const { data: citiesFromApi, isLoading: isCityLoading } = useCityList();
  const { isRecommendActive, isRecommendLoading, recommendResults } = useUiStore();
  const { data: viewHistory, isLoading: isHistoryLoading } = useViewHistory();

  const cities = citiesFromApi ?? [];

  const switchTab = () => {
    const nextIdx = TABS.indexOf(tab) === 0 ? 1 : 0;
    dirRef.current = nextIdx === 1 ? 1 : -1;
    setTab(TABS[nextIdx]);
  };

  const topCities = useMemo((): CityListItem[] => {
    if (isRecommendActive && recommendResults.length > 0) {
      return recommendResults.slice(0, TOP_N).map((r) => {
        const matched = cities.find((c) => c.cityName === r.city);
        return matched
          ? { ...matched, matchingScore: r.totalScore > 0 ? r.totalScore : undefined }
          : {
              cityId: r.cityId,
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

  const recentCities = viewHistory ?? [];
  const meta = TAB_META[tab];

  return (
    <section
      className={cn(
        "bg-white/85 backdrop-blur-md rounded-2xl shadow-lg p-4",
        "flex flex-col gap-2 flex-1 min-h-0 overflow-hidden",
      )}
    >
      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className={cn("transition-colors", tab === "matching" ? "text-blue-500" : "text-indigo-500")}>
            {meta.icon}
          </span>
          <AnimatePresence mode="wait">
            <motion.h2
              key={tab}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="text-xs font-bold text-slate-700 whitespace-nowrap"
            >
              {meta.label}
            </motion.h2>
          </AnimatePresence>
        </div>

        {/* 단일 전환 버튼 */}
        <button
          onClick={switchTab}
          className={cn(
            "flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg",
            "text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors",
          )}
          aria-label={`${meta.nextLabel}으로 전환`}
        >
          {meta.nextLabel}
          <ChevronRight className="size-3" />
        </button>
      </div>

      {/* ── 슬라이드 콘텐츠 ── */}
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={dirRef.current}>
          <motion.div
            key={tab}
            custom={dirRef.current}
            variants={{
              enter: (dir: number) => ({ x: dir * 60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (dir: number) => ({ x: dir * -60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="absolute inset-0 flex flex-col"
          >
            {tab === "matching" ? (
              <>
                {isCityLoading && (
                  <div className="flex flex-col gap-2">
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
                {!isCityLoading && isRecommendLoading && (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 py-6">
                    <Loader2 className="size-8 text-blue-400 animate-spin" />
                    <p className="text-xs font-medium text-slate-600">추천 여행지 계산 중...</p>
                    <p className="text-[10px] text-slate-400">잠시만 기다려 주세요</p>
                  </div>
                )}
                {!isCityLoading && !isRecommendLoading && !isRecommendActive && (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 py-6 text-center">
                    <RefreshCw className="size-8 text-slate-300" />
                    <p className="text-xs font-medium text-slate-600">아직 추천 결과가 없어요</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      여행 설정을 입력하고<br />추천 업데이트를 눌러주세요
                    </p>
                  </div>
                )}
                {!isCityLoading && !isRecommendLoading && isRecommendActive && topCities.length === 0 && (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 py-6 text-center">
                    <SearchX className="size-8 text-slate-300" />
                    <p className="text-xs font-medium text-slate-600">추천된 도시가 없습니다</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      설정을 변경하고<br />다시 추천해주세요
                    </p>
                  </div>
                )}
                {!isCityLoading && !isRecommendLoading && isRecommendActive && topCities.length > 0 && (
                  <ul className="flex flex-col overflow-y-auto flex-1" role="list">
                    {topCities.map((city, index) => (
                      <li key={city.cityId} role="listitem">
                        <TopMatchingCard city={city} rank={index + 1} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                {isHistoryLoading && (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5">
                        <Skeleton className="size-10 rounded-xl" />
                        <div className="flex flex-col gap-1.5 flex-1">
                          <Skeleton className="h-3.5 w-24 rounded" />
                          <Skeleton className="h-3 w-16 rounded" />
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <Skeleton className="h-3.5 w-12 rounded" />
                          <Skeleton className="h-3 w-10 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!isHistoryLoading && recentCities.length === 0 && (
                  <div className="flex flex-col items-center justify-center flex-1 gap-3 py-6 text-center">
                    <Clock className="size-8 text-slate-300" />
                    <p className="text-xs font-medium text-slate-600">최근 탐험한 여행지가 없어요</p>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      지구본에서 도시를 클릭하면<br />여기에 기록됩니다
                    </p>
                  </div>
                )}
                {!isHistoryLoading && recentCities.length > 0 && (
                  <ul className="flex flex-col overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full" role="list">
                    {recentCities.map((item) => (
                      <li key={item.cityId} role="listitem">
                        <RecentCityCard item={item} cities={cities} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
