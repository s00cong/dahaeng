import { AnimatePresence, motion } from "framer-motion";
import { X, Plane, Wallet, Shield, ChevronRight, ChevronLeft, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUiStore } from "@/stores/uiStore";
import { useCityDetail } from "@/hooks/city/useCityDetail";
import { useCityList } from "@/hooks/city/useCityList";
import { useCostDetail } from "@/hooks/cost/useCostDetail";

// 패널 폭 300px, 탭 24px, 간격 8px
const PANEL_W = 300;
const TAB_W = 24;
const GAP = 8;

function getMatchColor(score: number | undefined) {
  if (score === undefined) return "bg-slate-100 text-slate-600";
  if (score >= 80) return "bg-emerald-500 text-white";
  if (score >= 50) return "bg-blue-500 text-white";
  return "bg-amber-500 text-white";
}

const DANGER_PRIORITY = ["여행금지", "출국권고", "여행자제", "여행유의"];

function getDangerInfo(items: { level: string }[] | undefined) {
  if (!items || items.length === 0) return { label: "안전", textColor: "text-emerald-600", bgColor: "bg-emerald-50", iconColor: "text-emerald-500" };
  const topLevel = DANGER_PRIORITY.find((d) => items.some((i) => i.level === d));
  if (topLevel === "여행금지") return { label: "여행금지", textColor: "text-red-600", bgColor: "bg-red-50", iconColor: "text-red-500" };
  if (topLevel === "출국권고") return { label: "출국권고", textColor: "text-orange-600", bgColor: "bg-orange-50", iconColor: "text-orange-500" };
  if (topLevel === "여행자제") return { label: "여행자제", textColor: "text-amber-600", bgColor: "bg-amber-50", iconColor: "text-amber-500" };
  return { label: "여행유의", textColor: "text-yellow-600", bgColor: "bg-yellow-50", iconColor: "text-yellow-500" };
}

export function RightPanel() {
  const {
    selectedCityId,
    selectedCityImgUrl,
    isRightPanelOpen,
    isRightPanelCollapsed,
    isRecommendActive,
    recommendResults,
    recommendRequest,
    closeRightPanel,
    openCityModal,
    toggleRightPanelCollapse,
  } = useUiStore();

  const { data: cities, isSuccess: citiesLoaded } = useCityList();
  const selectedCityName = cities?.find((c) => c.cityId === selectedCityId)?.cityName;
  const isRecommendedCity =
    isRecommendActive &&
    recommendResults.some((r) => r.city === selectedCityName);

  const { data: cityFromApi, isLoading } = useCityDetail(
    selectedCityId,
    isRecommendedCity,
    {
      enabled: citiesLoaded,
      recommendParams: isRecommendedCity && recommendRequest ? recommendRequest : undefined,
    },
  );

  const city = cityFromApi ?? null;
  const { data: costDetail } = useCostDetail('city', selectedCityId ?? 0);

  const handleOpenDetail = () => {
    openCityModal("recommend");
  };

  // 확장: x = -12 (right-3 효과)
  // 접힘: x = PANEL_W + GAP (패널 화면 밖, 탭만 보임)
  // 초기/종료: x = PANEL_W + GAP + TAB_W + 40 (완전히 화면 밖)
  const expandedX = -12;
  const collapsedX = PANEL_W + GAP;
  const hiddenX = PANEL_W + GAP + TAB_W + 40;

  return (
    <AnimatePresence>
      {isRightPanelOpen && (
        <motion.aside
          key="right-panel"
          className="absolute z-20 top-[72px] bottom-3 flex flex-row items-start"
          style={{ right: 0 }}
          initial={{ x: hiddenX, opacity: 0 }}
          animate={{
            x: isRightPanelCollapsed ? collapsedX : expandedX,
            opacity: 1,
          }}
          exit={{ x: hiddenX, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          aria-label="도시 요약 패널"
        >
          {/* 탭 핸들 — 접혔을 때 화면 오른쪽 가장자리에 살짝 보임 */}
          <button
            onClick={toggleRightPanelCollapse}
            className="mt-24 flex flex-col items-center justify-center py-3
                       rounded-l-xl bg-white/90 backdrop-blur-md shadow-lg
                       text-slate-500 hover:text-slate-700 hover:bg-white
                       transition-colors focus:outline-none"
            style={{ width: TAB_W, marginRight: GAP }}
            aria-label={isRightPanelCollapsed ? "패널 열기" : "패널 닫기"}
          >
            {isRightPanelCollapsed
              ? <ChevronLeft className="size-3.5" />
              : <ChevronRight className="size-3.5" />
            }
          </button>

          {/* 패널 콘텐츠 */}
          <div
            className="h-full rounded-2xl bg-white/90 backdrop-blur-md shadow-xl
                       flex flex-col overflow-hidden"
            style={{ width: PANEL_W }}
          >
            {/* ── 헤더 영역 ── */}
            <div className="relative h-36 shrink-0 overflow-hidden rounded-t-2xl bg-slate-200">
              {(city?.imgUrl || selectedCityImgUrl) && (
                <img
                  src={city?.imgUrl || selectedCityImgUrl!}
                  alt={city?.cityName}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* 닫기 버튼 */}
              <button
                onClick={closeRightPanel}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
                aria-label="패널 닫기"
              >
                <X className="size-3.5" />
              </button>

              {/* 도시명 */}
              <div className="absolute bottom-3 left-4 right-10">
                {isLoading ? (
                  <Skeleton className="h-6 w-32 bg-white/30" />
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-white leading-tight truncate">
                      {city?.cityName ?? "도시 정보"}
                    </h2>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3 text-white/70" />
                      <span className="text-xs text-white/80">
                        {city?.danger?.countryName ?? "나라 정보"}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* 매칭 점수 배지 */}
              {!isLoading &&
                city?.score?.finalScore !== undefined &&
                city.score.finalScore !== null && (
                  <Badge
                    className={`absolute top-2.5 left-3 text-xs font-bold border-none ${getMatchColor(city.score.finalScore)}`}
                  >
                    {city.score.finalScore}% 매칭
                  </Badge>
                )}
            </div>

            {/* ── 스크롤 콘텐츠 영역 ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {/* 키워드 태그 */}
              {isLoading ? (
                <div className="flex gap-1.5 flex-wrap">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-5 w-14 rounded-full" />
                  ))}
                </div>
              ) : city?.tags && city.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {city.tags.map((tag) => (
                    <span
                      key={tag.name}
                      className="text-[11px] bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5 font-medium"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* 핵심 지표 3개 */}
              <div className="grid grid-cols-3 gap-2">
                {/* 예상 예산 */}
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-blue-50">
                  <Wallet className="size-4 text-blue-500" />
                  <span className="text-[10px] text-slate-500 text-center">일 예산</span>
                  {isLoading ? (
                    <Skeleton className="h-4 w-12" />
                  ) : (
                    <span className="text-xs font-bold text-slate-800 text-center">
                      {(() => {
                        const dailyBudget = costDetail?.living_cost?.daily_budget;
                        if (!dailyBudget) return "-";
                        return `₩${((dailyBudget + 30000) / 10000).toFixed(0)}만`;
                      })()}
                    </span>
                  )}
                </div>

                {/* 항공권 */}
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-amber-50">
                  <Plane className="size-4 text-amber-500" />
                  <span className="text-[10px] text-slate-500 text-center">왕복 항공</span>
                  {isLoading ? (
                    <Skeleton className="h-4 w-12" />
                  ) : (
                    <span className="text-xs font-bold text-slate-800 text-center">
                      {(() => {
                        const price = city?.airTicketAndHotel?.airTicket;
                        return price ? `₩${(price / 10000).toFixed(0)}만~` : "-";
                      })()}
                    </span>
                  )}
                </div>

                {/* 안전 */}
                {(() => {
                  const { label, textColor, bgColor, iconColor } = getDangerInfo(city?.danger?.items);
                  return (
                    <div className={`flex flex-col items-center gap-1 p-2.5 rounded-xl ${bgColor}`}>
                      <Shield className={`size-4 ${iconColor}`} />
                      <span className="text-[10px] text-slate-500 text-center">안전도</span>
                      {isLoading ? (
                        <Skeleton className="h-4 w-12" />
                      ) : (
                        <span className={`text-[10px] font-bold text-center leading-tight ${textColor}`}>
                          {label}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 추천 이유 or 위험도 */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                {isRecommendedCity ? (
                  <>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">AI 추천 이유</p>
                    {isLoading ? (
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {city?.recommendationReason ?? "추천 이유를 불러오는 중입니다."}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">위험도</p>
                    {isLoading ? (
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    ) : city?.danger?.items && city.danger.items.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {city.danger.items.map((item, i) => (
                          <li key={i} className="text-xs text-slate-500 leading-relaxed">
                            <span className="font-medium text-slate-600">[{item.level}]</span>{" "}
                            {item.description}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">위험 정보가 없습니다.</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── 하단 고정 버튼 ── */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white/80 shrink-0">
              <Button
                onClick={handleOpenDetail}
                variant="dark"
                className="w-full gap-2"
                size="lg"
                disabled={!city}
              >
                상세 보기
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
