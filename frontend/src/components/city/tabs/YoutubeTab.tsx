import { useState, useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CityDetail } from "@/schemas/city.schema";
import { useInterestAnalysis } from "@/hooks/youtube/useInterestAnalysis";
import type { InterestTag, TopKeyword } from "@/api/youtube.api";

// ── sourceType 라벨 ───────────────────────────────────────────
const SOURCE_LABEL: Record<string, { emoji: string; label: string; color: string }> = {
  PLAYLIST_TITLE:     { emoji: "📋", label: "재생목록",    color: "bg-purple-50 text-purple-700 border-purple-200" },
  LIKED_VIDEO_TAG:    { emoji: "👍", label: "좋아요 영상", color: "bg-red-50 text-red-600 border-red-200" },
  SUBSCRIPTION_TITLE: { emoji: "🔔", label: "구독 채널",   color: "bg-amber-50 text-amber-700 border-amber-200" },
};

function sourceInfo(sourceType: string) {
  return SOURCE_LABEL[sourceType] ?? { emoji: "📊", label: sourceType, color: "bg-slate-50 text-slate-600 border-slate-200" };
}

// ── 키워드 워드 클라우드 ──────────────────────────────────────
const SOURCE_TEXT_COLOR: Record<string, string> = {
  PLAYLIST_TITLE:     "text-purple-600",
  LIKED_VIDEO_TAG:    "text-red-500",
  SUBSCRIPTION_TITLE: "text-amber-600",
};

const CLOUD_H = 260;
const PAD = 3;

type PlacedWord = {
  text: string;
  sourceType: string;
  score: number;
  x: number; y: number; w: number; h: number;
  fontSize: number; fontWeight: string; opacity: number; rotate: number;
};

const ROTATE_OPTS = [0, 0, 0, 90, 0, 0, -90, 0, 0, 90];

function getFontSize(score: number) {
  if (score >= 0.88) return { fontSize: 34, fontWeight: "900", opacity: 1.00 };
  if (score >= 0.80) return { fontSize: 27, fontWeight: "800", opacity: 0.95 };
  if (score >= 0.70) return { fontSize: 21, fontWeight: "700", opacity: 0.88 };
  if (score >= 0.55) return { fontSize: 17, fontWeight: "600", opacity: 0.78 };
  return               { fontSize: 14, fontWeight: "500", opacity: 0.62 };
}

function rectsOverlap(a: PlacedWord, b: PlacedWord) {
  return !(
    a.x + a.w + PAD < b.x || b.x + b.w + PAD < a.x ||
    a.y + a.h + PAD < b.y || b.y + b.h + PAD < a.y
  );
}

function buildCloud(keywords: TopKeyword[], containerW: number): PlacedWord[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const sorted = [...keywords].sort((a, b) => b.score - a.score);
  const placed: PlacedWord[] = [];

  sorted.forEach((kw, idx) => {
    const { fontSize, fontWeight, opacity } = getFontSize(kw.score);
    const rotate = ROTATE_OPTS[idx % ROTATE_OPTS.length];

    ctx.font = `${fontWeight} ${fontSize}px sans-serif`;
    const tw = ctx.measureText(kw.normalizedKeyword).width + 2;
    const th = fontSize * 1.25;

    const bw = Math.abs(rotate) === 90 ? th : tw;
    const bh = Math.abs(rotate) === 90 ? tw : th;

    let done = false;
    const a = 1.6;
    for (let theta = 0; theta < 300 && !done; theta += 0.12) {
      const r = a * theta;
      const cx = containerW / 2 + r * Math.cos(theta);
      const cy = CLOUD_H / 2 + r * Math.sin(theta);
      const x = cx - bw / 2;
      const y = cy - bh / 2;

      if (x < 2 || y < 2 || x + bw > containerW - 2 || y + bh > CLOUD_H - 2) continue;

      const candidate: PlacedWord = {
        text: kw.normalizedKeyword, sourceType: kw.sourceType, score: kw.score,
        x, y, w: bw, h: bh, fontSize, fontWeight, opacity, rotate,
      };

      if (!placed.some((p) => rectsOverlap(p, candidate))) {
        placed.push(candidate);
        done = true;
      }
    }
  });

  return placed;
}

function KeywordCloud({ keywords }: { keywords: TopKeyword[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<PlacedWord[]>([]);

  useEffect(() => {
    if (!containerRef.current || keywords.length === 0) return;
    const w = containerRef.current.clientWidth;
    setPlaced(buildCloud(keywords, w));
  }, [keywords]);

  if (keywords.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 overflow-hidden">
      <div className="flex gap-3 px-3 pt-2.5 pb-1">
        {(["PLAYLIST_TITLE", "LIKED_VIDEO_TAG", "SUBSCRIPTION_TITLE"] as const).map((type) => {
          const labels: Record<string, string> = {
            PLAYLIST_TITLE: "📋 재생목록", LIKED_VIDEO_TAG: "👍 좋아요", SUBSCRIPTION_TITLE: "🔔 구독",
          };
          return (
            <span key={type} className={cn("text-[9px] font-semibold", SOURCE_TEXT_COLOR[type])}>
              {labels[type]}
            </span>
          );
        })}
      </div>
      <div ref={containerRef} className="relative" style={{ height: CLOUD_H }}>
        {placed.map((w, i) => (
          <span
            key={i}
            className={cn(
              "absolute leading-none select-none cursor-default transition-opacity hover:opacity-100",
              SOURCE_TEXT_COLOR[w.sourceType] ?? "text-slate-500",
            )}
            style={{
              left: w.x + w.w / 2,
              top: w.y + w.h / 2,
              fontSize: w.fontSize,
              fontWeight: w.fontWeight,
              opacity: w.opacity,
              transform: `translate(-50%, -50%) rotate(${w.rotate}deg)`,
            }}
            title={`${Math.round(w.score * 100)}점`}
          >
            {w.text}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 스텝 연결 화살표 ──────────────────────────────────────────
function StepConnector() {
  return (
    <div className="flex justify-center my-1">
      <ChevronRight className="size-3.5 text-slate-300 rotate-90" />
    </div>
  );
}

// ── 태그 카드 (3단계 흐름) ─────────────────────────────────────
function InterestTagCard({
  interestTag,
  cityTagScore,
  isMatched,
}: {
  interestTag: InterestTag;
  cityTagScore: number | null | undefined;
  isMatched: boolean;
}) {
  const [open, setOpen] = useState(isMatched);
  const userScore = interestTag.score ?? 0;
  const confidence = interestTag.confidence ?? 0;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden shadow-sm",
        isMatched ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-white",
      )}
    >
      <button
        className="w-full flex items-start gap-2.5 p-3 hover:bg-black/[0.03] transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {isMatched && (
          <span className="mt-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-100 border border-emerald-200 rounded-full px-1.5 py-0.5 shrink-0 leading-none">
            ✓ 매칭
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-bold text-slate-800">#{interestTag.tagName}</span>
            <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">
              {interestTag.categoryName}
            </span>
          </div>
          {interestTag.reason && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-1 italic">
              {interestTag.reason}
            </p>
          )}
          {interestTag.sourceBadges.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1.5">
              {interestTag.sourceBadges.map((badge, i) => {
                const src = sourceInfo(badge.sourceType);
                return (
                  <span key={i} className={cn("text-[9px] font-medium border rounded-full px-1.5 py-0.5 leading-none", src.color)}>
                    {src.emoji} {badge.percent}%
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {userScore > 0 && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[9px] text-slate-400 leading-none">관심도</span>
              <span className="text-[12px] font-black text-blue-600 leading-none">{Math.round(userScore * 100)}%</span>
            </div>
          )}
          {isMatched && cityTagScore != null && (
            <>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[9px] text-slate-400 leading-none">도시 일치</span>
                <span className="text-[12px] font-black text-emerald-600 leading-none">{Math.round(cityTagScore * 100)}%</span>
              </div>
            </>
          )}
          <ChevronRight className={cn("size-3.5 text-slate-300 ml-0.5 transition-transform shrink-0", open && "rotate-90")} />
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-3 pb-4 pt-3">
          {interestTag.evidenceKeywords.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold flex items-center justify-center shrink-0">①</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">유튜브 소스에서 키워드 발견</span>
              </div>
              <div className="flex flex-col gap-1.5 pl-1">
                {interestTag.evidenceKeywords.map((ev, i) => {
                  const src = sourceInfo(ev.sourceType);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-medium border rounded-full px-2 py-0.5 shrink-0 leading-none", src.color)}>
                        {src.emoji} {src.label}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 flex-1 truncate">{ev.keyword}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="w-14 bg-slate-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-blue-400" style={{ width: `${ev.score * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500 w-6 text-right tabular-nums">{ev.score.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <StepConnector />

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold flex items-center justify-center shrink-0">②</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">AI 분석 결과</span>
            </div>
            <div className="bg-blue-50/70 border border-blue-100 rounded-lg px-3 py-2 pl-1 ml-1">
              <p className="text-[11px] text-blue-700 leading-relaxed font-medium italic pl-2">
                "{interestTag.reason ?? '분석 결과가 없습니다.'}"
              </p>
            </div>
          </div>

          <StepConnector />

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold flex items-center justify-center shrink-0">③</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">도출된 태그</span>
            </div>
            <div className="ml-1 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-black text-slate-900">#{interestTag.tagName}</span>
                {userScore > 0 && <span className="text-[11px] font-semibold text-blue-600">관심도 {Math.round(userScore * 100)}%</span>}
                {confidence > 0 && <span className="text-[11px] font-semibold text-slate-500">신뢰도 {Math.round(confidence * 100)}%</span>}
              </div>
              {confidence > 0 && (
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${confidence * 100}%` }} />
                </div>
              )}
              {isMatched && cityTagScore != null && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-emerald-500 text-[12px]">✓</span>
                  <span className="text-[11px] text-slate-700 flex-1">
                    이 도시도 <span className="font-bold">#{interestTag.tagName}</span> 태그 보유
                  </span>
                  <span className="text-[12px] font-black text-emerald-600">{Math.round(cityTagScore * 100)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── YoutubeTab ────────────────────────────────────────────────
export function YoutubeTab({ city }: { city: CityDetail }) {
  const { data: analysis, isLoading, isError } = useInterestAnalysis();

  const relevantCityTags = city.tags?.filter((ct) => (ct.tagScore ?? 0) >= 0.6) ?? [];
  const cityTagNames = new Set(relevantCityTags.map((ct) => ct.name));
  const cityTagScore = (tagName: string) =>
    relevantCityTags.find((ct) => ct.name === tagName)?.tagScore;

  const allTags = analysis?.tags ?? [];
  const topKeywords = analysis?.topKeywords ?? [];
  const matchedTags = allTags.filter((t) => cityTagNames.has(t.tagName));
  const unmatchedTags = allTags.filter((t) => !cityTagNames.has(t.tagName));

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-100 p-3 flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isError || allTags.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center gap-3">
        <span className="text-4xl">📺</span>
        <p className="text-sm text-slate-400">
          {isError ? "YouTube 계정이 연동되지 않았습니다." : "아직 분석된 유튜브 취향 데이터가 없습니다."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50/30">
      <section className="p-6 pb-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📺</span>유튜브 취향 분석
          </h2>
          {matchedTags.length > 0 && (
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              {matchedTags.length}개 도시 매칭
            </span>
          )}
        </div>

        {topKeywords.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              내 유튜브 주요 키워드
            </p>
            <KeywordCloud keywords={topKeywords} />
          </div>
        )}
      </section>

      <section className="p-6 pt-4 flex flex-col gap-3">
        {matchedTags.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-emerald-600 mb-2">이 도시와 일치하는 취향</p>
            <div className="flex flex-col gap-2">
              {matchedTags.map((tag) => (
                <InterestTagCard
                  key={tag.tagId}
                  interestTag={tag}
                  cityTagScore={cityTagScore(tag.tagName)}
                  isMatched
                />
              ))}
            </div>
          </div>
        )}

        {unmatchedTags.length > 0 && (
          <div>
            {matchedTags.length > 0 && (
              <p className="text-[11px] font-semibold text-slate-400 mb-2">내 다른 취향</p>
            )}
            <div className="flex flex-col gap-2">
              {unmatchedTags.map((tag) => (
                <InterestTagCard
                  key={tag.tagId}
                  interestTag={tag}
                  cityTagScore={undefined}
                  isMatched={false}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
