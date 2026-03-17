import {
  Sparkles,
  Wallet,
  Plane,
  TrendingUp,
  Newspaper,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CityDetail } from "@/schemas/city.schema";
import { useExchangeRateNew } from "@/hooks/cost/useExchangeRateNew";
import { useCostDetail } from "@/hooks/cost/useCostDetail";
import dayjs from "dayjs";

interface RecommendTabProps {
  city: CityDetail;
  onTabChange: (tab: "recommend" | "cost" | "flight" | "spots") => void;
  isAiLoading?: boolean;
}

// ── 비용 항목 바 ──────────────────────────────────────────────
interface CostBarProps {
  label: string;
  amount: string;
  pct: number;
  color: string;
}

function CostBar({ label, amount, pct, color }: CostBarProps) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="text-slate-500 font-bold">{amount}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div
          className={cn("h-1.5 rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── 정보 카드 (항공, 물가 이동) ──────────────────────────────
interface InfoCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
  onClick: () => void;
}

function InfoCard({ icon: Icon, label, value, subValue, onClick }: InfoCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-xl border border-slate-200 flex items-center gap-2.5",
        "hover:border-blue-300 hover:bg-blue-50/40 transition-colors text-left",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50",
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
        <Icon className="size-3.5 text-blue-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500">{label}</p>
        <p className="text-xs font-bold text-slate-900 truncate">{value}</p>
        {subValue && <p className="text-[9px] text-slate-400 truncate mt-0.5">{subValue}</p>}
      </div>
    </button>
  );
}

// ── RecommendTab ─────────────────────────────────────────────
export function RecommendTab({ city, onTabChange, isAiLoading = false }: RecommendTabProps) {
  const recommendText = city.recommendationReason;

  // livingCostFor1Day: food, transportation은 USD 월간 비용 → KRW 변환
  const lc = city.livingCostFor1Day;
  const { data: erData } = useExchangeRateNew('USD');
  const usdToKrw = erData?.krw_per_1target ?? null;
  const foodKRW = lc && usdToKrw ? Math.round(lc.food * usdToKrw) : (lc?.food ?? 0);
  const transKRW = lc && usdToKrw ? Math.round(lc.transportation * usdToKrw) : (lc?.transportation ?? 0);

  // 숙박: living_cost_of_city.without_rent — API가 이미 KRW로 반환하므로 그대로 사용
  const { data: costDetail } = useCostDetail('city', city.cityId);
  const hotelMonthly = costDetail?.living_cost?.without_rent ?? (city.airTicketAndHotel?.hotel ?? 0);

  const at = city.airTicketAndHotel;
  const totalMonthly = lc ? (foodKRW + transKRW + hotelMonthly) : undefined;

  const accomPct = totalMonthly ? (hotelMonthly / totalMonthly) * 100 : 45;
  const foodPct = totalMonthly ? (foodKRW / totalMonthly) * 100 : 35;
  const transPct = totalMonthly ? (transKRW / totalMonthly) * 100 : 20;

  // 항공권 정보
  const flightValue = at?.airTicket
    ? `₩${at.airTicket.toLocaleString()}~`
    : "조회하기";

  const costValue = totalMonthly ? `월평균 ₩${totalMonthly.toLocaleString()}` : "비교 보기";

  return (
    <div className="flex flex-col h-full bg-slate-50/30">
      {/* 상단: AI 추천 사유 (고정 영역) */}
      <section className="p-6 pb-0">
        <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Sparkles className="size-5 text-blue-500" aria-hidden="true" />
          {city.cityName} 추천 이유
        </h2>
        <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm">
          {isAiLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : (
            <p className="text-slate-700 leading-relaxed text-base italic">
              "{recommendText ?? 'AI가 분석한 추천 이유를 불러오는 중입니다.'}"
            </p>
          )}
          {/* 키워드 뱃지 */}
          {city.tags && city.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {city.tags.map((t) => t.name).map((kw) => (
                <Badge
                  key={kw}
                  variant="outline"
                  className="text-[11px] text-blue-600 border-blue-200 bg-blue-50 rounded-full px-3 py-0.5 font-medium"
                >
                  #{kw}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 하단: 1:1 가로 배치 그리드 */}
      <div className="grid grid-cols-2 gap-6 p-6 flex-1 min-h-0">
        {/* 왼쪽: 예산 계획 */}
        <section className="flex flex-col gap-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="size-4 text-blue-500" aria-hidden="true" />
            예산 계획
          </h3>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex-1 flex flex-col">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              한달 예상 비용
            </p>

            {totalMonthly ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-end gap-1.5">
                  <span className="text-3xl font-black text-slate-900 leading-none">
                    ₩{totalMonthly.toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-xs font-medium">/ 월</span>
                </div>

                <div className="space-y-4">
                  <CostBar
                    label="숙박 (평균)"
                    amount={`₩${(hotelMonthly || Math.round(totalMonthly * 0.45)).toLocaleString()}`}
                    pct={accomPct}
                    color="bg-blue-500"
                  />
                  <CostBar
                    label="식비"
                    amount={`₩${(foodKRW || Math.round(totalMonthly * 0.35)).toLocaleString()}`}
                    pct={foodPct}
                    color="bg-emerald-500"
                  />
                  <CostBar
                    label="교통"
                    amount={`₩${(transKRW || Math.round(totalMonthly * 0.2)).toLocaleString()}`}
                    pct={transPct}
                    color="bg-amber-500"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 py-4 text-slate-400">
                <AlertCircle className="size-4" />
                <p className="text-sm">비용 로드 중...</p>
              </div>
            )}

            <div className="mt-auto pt-5 flex flex-col gap-2.5 border-t border-slate-50">
              <InfoCard
                icon={Plane}
                label="최저 항공권 (왕복)"
                value={flightValue}
                onClick={() => onTabChange("flight")}
              />
              <InfoCard
                icon={TrendingUp}
                label="생활물가 비교"
                value={costValue}
                onClick={() => onTabChange("cost")}
              />
            </div>
          </div>
        </section>

        {/* 오른쪽: 현지 소식 요약 */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Newspaper className="size-4 text-blue-500" aria-hidden="true" />
              현지 소식 요약
            </h3>
            <button
              onClick={() => onTabChange("spots")}
              className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5"
            >
              전체보기 <ChevronRight className="size-3" />
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex-1 flex flex-col gap-4 overflow-hidden">
            {/* AI Summation */}
            {isAiLoading ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            ) : city.news?.summation ? (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-[13px] text-slate-600 leading-relaxed font-medium italic">
                  "{city.news.summation}"
                </p>
              </div>
            ) : null}

            {/* Top 3 News Preview */}
            <div className="flex flex-col gap-2 overflow-y-auto">
              {isAiLoading ? (
                [1, 2, 3].map((i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-100 flex flex-col gap-1.5">
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                ))
              ) : (
                <>
                  {city.news?.top3?.map((news, idx) => (
                    <a
                      key={idx}
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-[13px] font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {news.title}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {dayjs(news.publishedAt).format('YYYY.MM.DD')}
                        </p>
                      </div>
                      <ExternalLink className="size-3 text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                    </a>
                  ))}
                  {(!city.news?.top3 || city.news.top3.length === 0) && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 py-8">
                      <Newspaper className="size-8 opacity-20" />
                      <p className="text-xs">관련 소식이 없습니다.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
