import { useEffect, useCallback } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Loader2, AlertCircle, X, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUiStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useCityDetail } from "@/hooks/city/useCityDetail";
import { useCityList } from "@/hooks/city/useCityList";
import { DestinationHeroCard } from "@/components/city/DestinationHeroCard";
import { CityDetailTabNav } from "@/components/city/CityDetailTabNav";
import { RecommendTab } from "@/components/city/tabs/RecommendTab";
import { YoutubeTab } from "@/components/city/tabs/YoutubeTab";
import { CostCompareTab } from "@/components/city/tabs/CostCompareTab";
import { FlightTab } from "@/components/city/tabs/FlightTab";
import { SpotTab } from "@/components/city/tabs/SpotTab";
import { FlightLoadingOverlay } from "@/components/city/FlightLoadingOverlay";
// 배경 오버레이 페이드 인/아웃 애니메이션 정의
const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// 모달 전체의 등장/퇴장 애니메이션 정의 (scale + opacity)
const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

// 탭 전환 시 콘텐츠 영역의 슬라이드 페이드 애니메이션 정의
const contentVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// 도시 데이터 로딩 중 좌측 히어로 카드 자리에 표시되는 스켈레톤 플레이스홀더
function HeroSkeleton() {
  return (
    <div className="relative flex flex-col w-72 shrink-0 rounded-l-2xl overflow-hidden bg-slate-200 dark:bg-slate-800">
      <div className="flex-1" />
      <div className="p-5 flex flex-col gap-3">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function CityDetailModal() {
  // 모달 열림 여부, 선택된 도시 ID, 활성 탭, 탭 변경 핸들러를 전역 스토어에서 가져옴
  const {
    selectedCityId,
    isCityModalOpen,
    activeCityTab,
    isRecommendActive,
    recommendResults,
    recommendRequest,
    closeCityModal,
    setActiveCityTab,
  } = useUiStore();

  const { isGuest } = useAuthStore();
  const { data: cities } = useCityList();
  const selectedCity = cities?.find((c) => c.cityId === selectedCityId);
  const selectedCityName = selectedCity?.cityName;
  const isRecommendedCity =
    isRecommendActive &&
    recommendResults.some((r) => r.city === selectedCityName);

  // 게스트 모드에서는 recommend=false, 추천 이유/유튜브 탭 숨김
  const showRecommendTabs = isRecommendedCity && !isGuest;

  const {
    data: basicCity,
    isLoading,
    isError,
    refetch,
  } = useCityDetail(selectedCityId, showRecommendTabs, {
    enabled: isCityModalOpen,
    recommendParams:
      showRecommendTabs && recommendRequest ? recommendRequest : undefined,
  });

  const city = basicCity ?? null;
  const showError = isError && !city;

  // 비추천/게스트 도시 열릴 때 추천 이유 탭이 활성이면 생활물가 탭으로 전환
  useEffect(() => {
    if (!showRecommendTabs && (activeCityTab === "recommend" || activeCityTab === "youtube")) {
      setActiveCityTab("cost");
    }
  }, [showRecommendTabs, activeCityTab, setActiveCityTab]);

  // ESC 키로 모달 닫기
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") closeCityModal();
  }, [closeCityModal]);

  useEffect(() => {
    if (isCityModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isCityModalOpen, handleKeyDown]);

  return (
    // 모달 열림/닫힘 시 AnimatePresence가 exit 애니메이션을 실행한 후 DOM에서 제거
    <AnimatePresence>
      {isCityModalOpen && (
        <>
          {/* 모달 외부 클릭 시 닫히는 반투명 배경 오버레이 */}
          <motion.div
            key="modal-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-40 backdrop-blur-sm"
            onClick={closeCityModal}
            aria-hidden="true"
          />

          {/* 뷰포트 전체를 덮는 모달 본체 (좌: 히어로 카드, 우: 탭 콘텐츠) */}
          <motion.div
            key="modal-content"
            role="dialog"
            aria-modal="true"
            aria-label={
              city ? `${city.cityName} 도시 상세 정보` : "도시 상세 정보"
            }
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-12 left-18 right-18 bottom-12 z-50 rounded-2xl overflow-hidden flex flex-row shadow-2xl"
          >
            {/* 우측 상단 X 버튼으로 모달 닫기 */}
            <button
              onClick={closeCityModal}
              aria-label="닫기"
              className="absolute top-3 right-3 z-50 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              <X className="size-4" />
            </button>

            {/* recommend=true 최초 로딩 시 비행 애니메이션 오버레이 */}
            <AnimatePresence>
              {isLoading && showRecommendTabs && selectedCity && (
                <motion.div
                  key="flight-loading"
                  className="absolute inset-0 z-30 rounded-2xl overflow-hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FlightLoadingOverlay
                    destLon={selectedCity.longitude}
                    destLat={selectedCity.latitude}
                    destName={selectedCity.cityName}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* 좌측: 로딩 중이거나 데이터 없으면 스켈레톤, 준비되면 히어로 카드 렌더링 */}
            {isLoading || !city ? (
              <HeroSkeleton />
            ) : (
              <DestinationHeroCard city={city} />
            )}

            {/* 우측: 탭 네비게이션 + 탭별 콘텐츠 영역 */}
            <div className="flex flex-col flex-1 min-w-0 bg-background">
              {/* 추천 / 비용 / 항공 / 뉴스 탭 전환 네비게이션 */}
              <CityDetailTabNav
                activeTab={activeCityTab}
                onTabChange={setActiveCityTab}
                showRecommendTab={showRecommendTabs}
              />

              {/* 스크롤 가능한 탭 콘텐츠 패널 */}
              <div
                id={`tab-panel-${activeCityTab}`}
                role="tabpanel"
                aria-label={activeCityTab}
                className="flex-1 overflow-y-auto"
              >
                {/* 데이터 로딩 중 스피너 표시 */}
                {isLoading && (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-8 animate-spin text-blue-500" />
                  </div>
                )}

                {/* API 실패 + 더미 없음: 에러 메시지 표시 */}
                {showError && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
                    <AlertCircle className="size-10 text-destructive" />
                    <p className="text-sm text-muted-foreground">
                      도시 정보를 불러오는데 실패했습니다.
                    </p>
                    <button
                      onClick={() => void refetch()}
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <RefreshCw className="size-3.5" />
                      다시 시도
                    </button>
                  </div>
                )}

                {/* 정상 상태: 활성 탭에 맞는 컴포넌트를 애니메이션과 함께 렌더링 */}
                {city && !isLoading && !showError && (
                  <motion.div
                    key={activeCityTab}
                    variants={contentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="h-full"
                  >
                    {activeCityTab === "recommend" && (
                      <RecommendTab
                        city={city}
                        onTabChange={setActiveCityTab}
                        isAiLoading={false}
                      />
                    )}
                    {activeCityTab === "youtube" && <YoutubeTab city={city} />}
                    {activeCityTab === "cost" && <CostCompareTab city={city} />}
                    {activeCityTab === "flight" && <FlightTab city={city} />}
                    {activeCityTab === "spots" && (
                      <SpotTab city={city} isRecommended={isRecommendedCity} />
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
