import { useState } from "react";
import {
  Sparkles,
  Wallet,
  Plane,
  TrendingUp,
  Newspaper,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CityDetail } from "@/schemas/city.schema";
import dayjs from "dayjs";

interface RecommendTabProps {
  city: CityDetail;
  onTabChange: (tab: "recommend" | "youtube" | "cost" | "flight" | "spots") => void;
  isAiLoading?: boolean;
}

// ── 뉴스 캐러셀 ───────────────────────────────────────────────

type NewsItem = NonNullable<NonNullable<CityDetail["news"]>["top3"]>[number];

function NewsCarousel({ news, isLoading }: { news?: NewsItem[]; isLoading?: boolean }) {
  const [idx, setIdx] = useState(0);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col gap-2 rounded-xl overflow-hidden border border-slate-100">
        <Skeleton className="h-36 w-full" />
        <div className="p-3 flex flex-col gap-2">
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>
    );
  }

  if (!news || news.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 py-8">
        <Newspaper className="size-8 opacity-20" />
        <p className="text-xs">관련 소식이 없습니다.</p>
      </div>
    );
  }

  const current = news[idx];
  const total = news.length;
  const domain = current.url ? (() => { try { return new URL(current.url).hostname; } catch { return null; } })() : null;
  const faviconSrc = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

  return (
    <div className="flex-1 flex flex-col rounded-xl border border-slate-100 overflow-hidden bg-white">
      {/* 이미지 영역 */}
      <div className="relative h-36 bg-slate-100 shrink-0">
        {current.urlToImage ? (
          <img
            key={current.urlToImage}
            src={current.urlToImage}
            alt={current.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = 'none';
              const fallback = img.parentElement?.querySelector('.favicon-fallback') as HTMLElement | null;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        {/* favicon 폴백 */}
        <div
          className="favicon-fallback absolute inset-0 flex items-center justify-center bg-slate-100"
          style={{ display: current.urlToImage ? 'none' : 'flex' }}
        >
          {faviconSrc
            ? <img src={faviconSrc} alt={domain ?? ""} className="w-12 h-12 object-contain opacity-50" />
            : <Newspaper className="size-10 text-slate-300" />
          }
        </div>
        {/* 그라디언트 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* 인덱스 표시 */}
        <div className="absolute top-2 right-2 bg-black/40 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
          {idx + 1} / {total}
        </div>
        {/* 좌우 화살표 */}
        {total > 1 && (
          <>
            <button
              onClick={() => setIdx((prev) => (prev - 1 + total) % total)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-colors"
              aria-label="이전 뉴스"
            >
              <ChevronLeft className="size-4 text-slate-700" />
            </button>
            <button
              onClick={() => setIdx((prev) => (prev + 1) % total)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-colors"
              aria-label="다음 뉴스"
            >
              <ChevronRight className="size-4 text-slate-700" />
            </button>
          </>
        )}
      </div>

      {/* 텍스트 영역 */}
      <a
        href={current.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex-1 flex flex-col gap-1.5 p-3 hover:bg-slate-50 transition-colors"
      >
        <p className="text-[12px] font-bold text-slate-800 line-clamp-3 group-hover:text-blue-600 transition-colors leading-snug">
          {current.title}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <p className="text-[10px] text-slate-400">{dayjs(current.publishedAt).format('YYYY.MM.DD')}</p>
          <ExternalLink className="size-3 text-slate-300 group-hover:text-blue-400 transition-colors" />
        </div>
      </a>

      {/* 하단 dot 인디케이터 */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${i === idx ? 'w-4 h-1.5 bg-blue-500' : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
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

  // livingCostFor1Day: 백엔드에서 이미 KRW로 변환된 월간 비용
  const lc = city.livingCostFor1Day;
  const foodKRW = lc?.food ?? 0;
  const transKRW = lc?.transportation ?? 0;

  const hotelDaily = lc?.accommodation ?? 0;

  const at = city.airTicketAndHotel;
  const totalDaily = lc ? (foodKRW + transKRW + hotelDaily) : undefined;

  const accomPct = totalDaily ? (hotelDaily / totalDaily) * 100 : 45;
  const foodPct = totalDaily ? (foodKRW / totalDaily) * 100 : 35;
  const transPct = totalDaily ? (transKRW / totalDaily) * 100 : 20;

  // 항공권 정보
  const flightValue = at?.airTicket
    ? `₩${at.airTicket.toLocaleString()}~`
    : "조회하기";

  const costValue = totalDaily ? `일평균 ₩${totalDaily.toLocaleString()}` : "비교 보기";

  return (
    <div className="flex flex-col min-h-full bg-slate-50/30">
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
              "{recommendText ?? '추천 이유 정보가 없습니다.'}"
            </p>
          )}
          {/* 키워드 뱃지 */}
          {city.tags && city.tags.some((t) => (t.tagScore ?? 0) >= 0.2) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {(() => {
                const sorted = [...city.tags!].sort((a, b) => (b.tagScore ?? 0) - (a.tagScore ?? 0));
                const high = sorted.filter((t) => (t.tagScore ?? 0) >= 0.6);
                const tags = high.length >= 5 ? high.slice(0, 5) : [...high, ...sorted.filter((t) => (t.tagScore ?? 0) >= 0.2 && (t.tagScore ?? 0) < 0.6)].slice(0, 5);
                return tags.map((t) => t.name);
              })().map((kw) => (
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
      <div className="grid grid-cols-2 gap-6 p-6">
        {/* 왼쪽: 예산 계획 */}
        <section className="flex flex-col gap-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="size-4 text-blue-500" aria-hidden="true" />
            예산 계획
          </h3>

          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              하루 예상 비용
            </p>

            {totalDaily ? (
              <div className="flex flex-col gap-5">
                <div className="flex items-end gap-1.5">
                  <span className="text-3xl font-black text-slate-900 leading-none">
                    ₩{totalDaily.toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-xs font-medium">/ 일</span>
                </div>

                <div className="space-y-4">
                  <CostBar
                    label="숙박 (평균)"
                    amount={`₩${(hotelDaily || Math.round(totalDaily * 0.45)).toLocaleString()}`}
                    pct={accomPct}
                    color="bg-blue-500"
                  />
                  <CostBar
                    label="식비"
                    amount={`₩${(foodKRW || Math.round(totalDaily * 0.35)).toLocaleString()}`}
                    pct={foodPct}
                    color="bg-emerald-500"
                  />
                  <CostBar
                    label="교통"
                    amount={`₩${(transKRW || Math.round(totalDaily * 0.2)).toLocaleString()}`}
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

            {/* Top 3 News Carousel */}
            <NewsCarousel news={city.news?.top3} isLoading={isAiLoading} />
          </div>
        </section>
      </div>
    </div>
  );
}
