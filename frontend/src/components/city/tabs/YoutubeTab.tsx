import { useState, useRef, useEffect } from "react";
import { Tv2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CityDetail } from "@/schemas/city.schema";
import { CITY_NAME_KO } from "@/data/cityNameKo";
import { useInterestAnalysis } from "@/hooks/youtube/useInterestAnalysis";
import type { InterestTag, TopKeyword } from "@/api/youtube.api";
import { youtubeApi } from "@/api/youtube.api";
import { useTagList } from "@/hooks/tag/useTagList";
import { useMemberTags } from "@/hooks/auth/useMemberTags";
import type { TagItem } from "@/api/tag.api";
import { useQuery } from "@tanstack/react-query";


// ── 키워드 워드 클라우드 ──────────────────────────────────────
const SOURCE_TEXT_COLOR: Record<string, string> = {
  PLAYLIST_TITLE:      "text-violet-600",
  PLAYLIST_VIDEO_TAG:  "text-purple-500",
  PLAYLIST_VIDEO_TITLE:"text-blue-500",
  LIKED_VIDEO_TAG:     "text-red-500",
  LIKED_VIDEO_TITLE:   "text-rose-400",
  SUBSCRIPTION_TITLE:  "text-amber-500",
};

const CLOUD_H = 420;
const PAD = 3;

type PlacedWord = {
  text: string;
  sourceType: string;
  score: number;
  x: number; y: number; w: number; h: number;
  fontSize: number; fontWeight: string; opacity: number; rotate: number;
};

const ROTATE_OPTS = [0, 0, 0, 90, 0, 0, -90, 0, 0, 90];

function getFontSizeByRank(rank: number) {
  if (rank === 1)       return { fontSize: 56, fontWeight: "900", opacity: 1.00 };
  if (rank <= 3)        return { fontSize: 44, fontWeight: "800", opacity: 0.95 };
  if (rank <= 7)        return { fontSize: 32, fontWeight: "700", opacity: 0.88 };
  if (rank <= 15)       return { fontSize: 24, fontWeight: "600", opacity: 0.78 };
  return                       { fontSize: 18, fontWeight: "500", opacity: 0.62 };
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
    const { fontSize, fontWeight, opacity } = getFontSizeByRank(idx + 1);
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

function KeywordCloud({ keywords, syncEnabled = true }: { keywords: TopKeyword[]; syncEnabled?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<PlacedWord[]>([]);

  useEffect(() => {
    if (!containerRef.current || keywords.length === 0) return;
    const w = containerRef.current.clientWidth;
    setPlaced(buildCloud(keywords, w));
  }, [keywords]);

  if (keywords.length === 0) return null;

  return (
    <div className={cn("rounded-2xl border border-slate-100 bg-slate-50/60 overflow-hidden", !syncEnabled && "opacity-40 grayscale")}>
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 pt-2.5 pb-1">
        {(["PLAYLIST_TITLE", "PLAYLIST_VIDEO_TAG", "PLAYLIST_VIDEO_TITLE", "LIKED_VIDEO_TAG", "LIKED_VIDEO_TITLE", "SUBSCRIPTION_TITLE"] as const).map((type) => {
          const labels: Record<string, string> = {
            PLAYLIST_TITLE:       "재생목록 제목",
            PLAYLIST_VIDEO_TAG:   "재생목록 영상 태그",
            PLAYLIST_VIDEO_TITLE: "재생목록 영상 제목",
            LIKED_VIDEO_TAG:      "좋아요 영상 태그",
            LIKED_VIDEO_TITLE:    "좋아요 영상 제목",
            SUBSCRIPTION_TITLE:   "구독 채널",
          };
          return (
            <span key={type} className={cn("text-[9px] font-semibold", SOURCE_TEXT_COLOR[type])}>
              ● {labels[type]}
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

// ── 태그 플로우 다이어그램 ─────────────────────────────────────
const KW_COL_W = 128;
const REASON_COL_W = 170;
const TAG_COL_W = 110;
const CITY_TAG_COL_W = 132;
const CITY_NAME_COL_W = 110;
const COL_GAP = 41;
const KW_H = 24;
const KW_GAP = 3;
const REASON_MIN_H = 60;
const TAG_H = 40;
const ROW_GAP = 14;
const HEADER_H = 24;
const CITY_CHIP_H = 28;
const CITY_CHIP_GAP = 6;

const TAG_PALETTE = [
  { bg: "#f5f3ff", border: "#c4b5fd", text: "#7c3aed", line: "#8b5cf6" },
  { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8", line: "#3b82f6" },
  { bg: "#fff7ed", border: "#fdba74", text: "#c2410c", line: "#f97316" },
  { bg: "#fdf4ff", border: "#e879f9", text: "#a21caf", line: "#d946ef" },
  { bg: "#f0fdf4", border: "#86efac", text: "#15803d", line: "#22c55e" },
  { bg: "#fef3c7", border: "#fcd34d", text: "#b45309", line: "#f59e0b" },
];

const USER_TAG_STYLE = { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8", line: "#3b82f6" };
const DISABLED_PALETTE = { bg: "#f8fafc", border: "#e2e8f0", text: "#94a3b8", line: "#cbd5e1" };

function TagFlowDiagram({
  tags,
  cityTagNames,
  allCityTags,
  cityName,
  softBridge,
  userTags = [],
  syncEnabled = true,
}: {
  tags: InterestTag[];
  cityTagNames: Set<string>;
  allCityTags: { name: string; tagScore?: number | null }[];
  cityName: string;
  softBridge?: { interestTagIdx: number; cityTagName: string };
  userTags?: TagItem[];
  syncEnabled?: boolean;
}) {
  const x0 = 0;
  const x1 = KW_COL_W + COL_GAP;
  const x2 = x1 + REASON_COL_W + COL_GAP;
  const x3 = x2 + TAG_COL_W + COL_GAP;
  const x4 = x3 + CITY_TAG_COL_W + COL_GAP;
  const totalW = x4 + CITY_NAME_COL_W;

  interface RowLayout {
    yTop: number;
    yCenter: number;
    contentH: number;
    kwYs: number[];
  }

  let curY = HEADER_H;
  const rowLayouts: RowLayout[] = tags.map((tag) => {
    const kwCount = Math.min(tag.evidenceKeywords.length, 6);
    const kwTotalH = kwCount > 0 ? kwCount * KW_H + (kwCount - 1) * KW_GAP : 0;
    const contentH = Math.max(kwTotalH, REASON_MIN_H);
    const yTop = curY;
    const yCenter = yTop + contentH / 2;
    const kwStartY = yCenter - kwTotalH / 2;
    const kwYs = Array.from({ length: kwCount }, (_, j) =>
      kwStartY + j * (KW_H + KW_GAP) + KW_H / 2
    );
    curY += contentH + ROW_GAP;
    return { yTop, yCenter, contentH, kwYs };
  });

  // 사용자 입력 태그 클러스터 레이아웃
  const userTagDividerY = tags.length > 0 ? curY - ROW_GAP + 8 : HEADER_H;
  const CLUSTER_PAD = 10;
  const CLUSTER_CHIP_H = 22;
  const CLUSTER_CHIP_GAP_X = 6;
  const CLUSTER_CHIP_GAP_Y = 6;
  const clusterW = x2 + TAG_COL_W;

  const matchedUserTags = userTags.filter((t) => cityTagNames.has(t.tagName));
  const unmatchedUserTags = userTags.filter((t) => !cityTagNames.has(t.tagName));

  // 오른쪽 열: 매칭 태그 (고정 너비 열)
  const RIGHT_COL_W = 90;
  const rightColX = clusterW - CLUSTER_PAD - RIGHT_COL_W;
  const leftAreaW = rightColX - CLUSTER_PAD * 2; // 비매칭 태그가 쓸 수 있는 너비

  const clusterChipPositions: { x: number; y: number; w: number; tagName: string; isRight: boolean }[] = [];

  // 오른쪽 열: 매칭 태그를 1열로 나란히
  matchedUserTags.forEach((ut, i) => {
    clusterChipPositions.push({
      x: rightColX,
      y: CLUSTER_PAD + i * (CLUSTER_CHIP_H + CLUSTER_CHIP_GAP_Y),
      w: RIGHT_COL_W,
      tagName: ut.tagName,
      isRight: true,
    });
  });

  // 왼쪽 영역: 비매칭 태그 줄바꿈 배치
  if (unmatchedUserTags.length > 0) {
    let chipX = CLUSTER_PAD;
    let chipY = CLUSTER_PAD;
    for (const ut of unmatchedUserTags) {
      const chipW = Math.min(leftAreaW, Math.max(52, (ut.tagName.length + 1) * 8 + 20));
      if (chipX + chipW > CLUSTER_PAD + leftAreaW) {
        chipX = CLUSTER_PAD;
        chipY += CLUSTER_CHIP_H + CLUSTER_CHIP_GAP_Y;
      }
      clusterChipPositions.push({ x: chipX, y: chipY, w: chipW, tagName: ut.tagName, isRight: false });
      chipX += chipW + CLUSTER_CHIP_GAP_X;
    }
  }

  const clusterContentH = clusterChipPositions.length > 0
    ? Math.max(...clusterChipPositions.map((p) => p.y + CLUSTER_CHIP_H)) + CLUSTER_PAD
    : 0;
  const clusterStartY = userTags.length > 0
    ? (tags.length > 0 ? userTagDividerY + 16 : HEADER_H)
    : 0;

  const userTagsH = userTags.length > 0 ? clusterStartY + clusterContentH : curY - ROW_GAP;

  // 도시 태그 칩 y 위치 계산 (column 3)
  const cityChipTotalH =
    allCityTags.length * CITY_CHIP_H + Math.max(0, allCityTags.length - 1) * CITY_CHIP_GAP;
  const totalH = Math.max(userTagsH, cityChipTotalH + HEADER_H);
  const cityChipStartY = (totalH - cityChipTotalH) / 2;

  const cityChipY: Record<string, number> = {};
  allCityTags.forEach((ct, j) => {
    cityChipY[ct.name] = cityChipStartY + j * (CITY_CHIP_H + CITY_CHIP_GAP) + CITY_CHIP_H / 2;
  });

  // 유저 관심 태그 중 도시 태그와 이름이 일치하는 것들의 집합
  const matchedCityTagNames = new Set([
    ...tags.filter((t) => t.tagId != null && cityTagNames.has(t.tagName)).map((t) => t.tagName),
    ...userTags.filter((t) => cityTagNames.has(t.tagName)).map((t) => t.tagName),
  ]);

  // 도시 이름 노드 y: 매칭된 칩들의 평균
  const matchedCityChipYs = allCityTags
    .filter((ct) => matchedCityTagNames.has(ct.name))
    .map((ct) => cityChipY[ct.name]);
  const cityNameY =
    matchedCityChipYs.length > 0
      ? matchedCityChipYs.reduce((a, b) => a + b, 0) / matchedCityChipYs.length
      : totalH / 2;

  type SvgLine = { d: string; stroke: string; opacity: number; sw: number; dashed?: boolean };
  const svgLines: SvgLine[] = [];

  tags.forEach((tag, i) => {
    const layout = rowLayouts[i];
    const disabled = !syncEnabled;
    const palette = disabled ? DISABLED_PALETTE : TAG_PALETTE[i % TAG_PALETTE.length];

    // Keywords → Reason (다대1)
    layout.kwYs.forEach((kwY, j) => {
      const score = tag.evidenceKeywords[j]?.score ?? 0.5;
      const opacity = disabled ? 0.2 : Math.min(0.85, 0.2 + Math.min(score, 1.5) * 0.35);
      const mx = (x0 + KW_COL_W + x1) / 2;
      svgLines.push({
        d: `M ${x0 + KW_COL_W} ${kwY} C ${mx} ${kwY} ${mx} ${layout.yCenter} ${x1} ${layout.yCenter}`,
        stroke: palette.line, opacity, sw: 1.2,
      });
    });

    // Reason → 관심 태그 (1대1)
    const mx2 = (x1 + REASON_COL_W + x2) / 2;
    svgLines.push({
      d: `M ${x1 + REASON_COL_W} ${layout.yCenter} C ${mx2} ${layout.yCenter} ${mx2} ${layout.yCenter} ${x2} ${layout.yCenter}`,
      stroke: palette.line, opacity: disabled ? 0.2 : 0.8, sw: 2,
    });

    // 관심 태그 → 도시 태그 칩 (비활성 태그는 연결 안 함)
    if (!disabled && tag.tagId != null && cityTagNames.has(tag.tagName)) {
      const cty = cityChipY[tag.tagName] ?? layout.yCenter;
      const mx3 = (x2 + TAG_COL_W + x3) / 2;
      svgLines.push({
        d: `M ${x2 + TAG_COL_W} ${layout.yCenter} C ${mx3} ${layout.yCenter} ${mx3} ${cty} ${x3} ${cty}`,
        stroke: "#10b981", opacity: 0.85, sw: 2,
      });
    }
  });


  // 사용자 입력 태그 → 도시 태그 연결 (오른쪽 열 매칭 칩에서)
  clusterChipPositions.forEach((pos) => {
    if (!pos.isRight || !cityTagNames.has(pos.tagName)) return;
    const chipCenterY = clusterStartY + pos.y + CLUSTER_CHIP_H / 2;
    const chipRightX = pos.x + pos.w;
    const cty = cityChipY[pos.tagName] ?? chipCenterY;
    const mx3 = (chipRightX + x3) / 2;
    svgLines.push({
      d: `M ${chipRightX} ${chipCenterY} C ${mx3} ${chipCenterY} ${mx3} ${cty} ${x3} ${cty}`,
      stroke: USER_TAG_STYLE.line, opacity: 0.85, sw: 1.5,
    });
  });

  // 모든 도시 태그 → 도시 이름 (매칭=초록, softBridge=황색, 비매칭=회색)
  allCityTags.forEach((ct) => {
    const cty = cityChipY[ct.name];
    const isMatched = matchedCityTagNames.has(ct.name);
    const isSoft = !isMatched && softBridge?.cityTagName === ct.name;
    const mx4 = (x3 + CITY_TAG_COL_W + x4) / 2;
    svgLines.push({
      d: `M ${x3 + CITY_TAG_COL_W} ${cty} C ${mx4} ${cty} ${mx4} ${cityNameY} ${x4} ${cityNameY}`,
      stroke: isMatched ? "#10b981" : isSoft ? "#f59e0b" : "#cbd5e1",
      opacity: isMatched ? 0.65 : isSoft ? 0.7 : 0.45,
      sw: isMatched ? 1.5 : isSoft ? 1.5 : 1,
      dashed: isSoft,
    });
  });

  // Soft bridge: 관심 태그 → 도시 태그 점선 연결
  if (softBridge) {
    const layout = rowLayouts[softBridge.interestTagIdx];
    const cty = cityChipY[softBridge.cityTagName];
    if (layout && cty !== undefined) {
      const mx3 = (x2 + TAG_COL_W + x3) / 2;
      svgLines.push({
        d: `M ${x2 + TAG_COL_W} ${layout.yCenter} C ${mx3} ${layout.yCenter} ${mx3} ${cty} ${x3} ${cty}`,
        stroke: "#f59e0b",
        opacity: 0.75,
        sw: 2,
        dashed: true,
      });
    }
  }

  const colHeaders = [
    { label: "유튜브 키워드", x: x0, w: KW_COL_W },
    { label: "AI 분석 이유", x: x1, w: REASON_COL_W },
    { label: "관심 태그", x: x2, w: TAG_COL_W },
    { label: "도시 태그", x: x3, w: CITY_TAG_COL_W },
    { label: "도시", x: x4, w: CITY_NAME_COL_W },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm p-4">
      <div className="relative" style={{ width: totalW, height: totalH }}>
        {/* 컬럼 헤더 */}
        {colHeaders.map(({ label, x, w }) => (
          <div
            key={label}
            className="absolute top-0 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center"
            style={{ left: x, width: w }}
          >
            {label}
          </div>
        ))}

        {/* SVG 연결선 */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={totalW}
          height={totalH}
          style={{ overflow: "visible" }}
        >
          {svgLines.map((line, i) => (
            <path
              key={i}
              d={line.d}
              stroke={line.stroke}
              strokeWidth={line.sw}
              strokeOpacity={line.opacity}
              strokeDasharray={line.dashed ? "5 3" : undefined}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* 키워드 칩 */}
        {tags.flatMap((tag, i) => {
          const layout = rowLayouts[i];
          const disabled = !syncEnabled;
          const palette = disabled ? DISABLED_PALETTE : TAG_PALETTE[i % TAG_PALETTE.length];
          return tag.evidenceKeywords.slice(0, 6).map((ev, j) => (
            <div
              key={`kw-${i}-${j}`}
              className="absolute flex items-center gap-1 px-1.5 rounded-lg border text-[11px] font-medium leading-none overflow-hidden"
              style={{
                left: x0, top: layout.kwYs[j] - KW_H / 2,
                width: KW_COL_W, height: KW_H,
                background: palette.bg, borderColor: palette.border, color: palette.text,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <span className="truncate flex-1">{ev.keyword}</span>
              <span className="shrink-0 text-[9px] opacity-60 ml-0.5">{ev.score.toFixed(2)}</span>
            </div>
          ));
        })}

        {/* AI 분석 이유 박스 */}
        {tags.map((tag, i) => {
          const layout = rowLayouts[i];
          const disabled = !syncEnabled;
          const palette = disabled ? DISABLED_PALETTE : TAG_PALETTE[i % TAG_PALETTE.length];
          return (
            <div
              key={`reason-${i}`}
              className="absolute rounded-xl border p-2.5 flex items-center"
              style={{
                left: x1, top: layout.yTop,
                width: REASON_COL_W, height: layout.contentH,
                background: palette.bg, borderColor: palette.border,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <p className="text-[11px] italic leading-relaxed line-clamp-4" style={{ color: palette.text }}>
                {disabled ? "유튜브 분석이 비활성화되었습니다." : `"${tag.reason ?? "분석 결과 없음"}"`}
              </p>
            </div>
          );
        })}

        {/* 관심 태그 뱃지 */}
        {tags.map((tag, i) => {
          const layout = rowLayouts[i];
          const disabled = !syncEnabled;
          const palette = disabled ? DISABLED_PALETTE : TAG_PALETTE[i % TAG_PALETTE.length];
          const isMatched = !disabled && cityTagNames.has(tag.tagName);
          return (
            <div
              key={`tag-${i}`}
              className="absolute rounded-xl border flex flex-col items-center justify-center gap-0.5 px-1 text-center"
              style={{
                left: x2, top: layout.yCenter - TAG_H / 2,
                width: TAG_COL_W, height: TAG_H,
                background: isMatched ? "#ecfdf5" : palette.bg,
                borderColor: isMatched ? "#6ee7b7" : palette.border,
                opacity: disabled ? 0.5 : 1,
              }}
            >
              <span className="text-[12px] font-black leading-tight" style={{ color: isMatched ? "#059669" : palette.text }}>
                #{tag.tagName}
              </span>
              <span className="text-[9px] font-semibold text-slate-400">
                {disabled ? "비활성" : `관심 ${Math.round((tag.score ?? 0) * 100)}%`}
              </span>
            </div>
          );
        })}

        {/* 사용자 입력 태그 구분선 */}
        {userTags.length > 0 && tags.length > 0 && (
          <div
            className="absolute flex items-center gap-2"
            style={{ left: x0, top: userTagDividerY, width: x2 + TAG_COL_W }}
          >
            <div className="flex-1 border-t border-dashed border-blue-200" />
            <span className="text-[9px] font-bold text-blue-400 shrink-0">사용자 입력 태그</span>
            <div className="flex-1 border-t border-dashed border-blue-200" />
          </div>
        )}

        {/* 사용자 입력 태그 클러스터 */}
        {userTags.length > 0 && (
          <>
            {/* 클러스터 배경 */}
            <div
              className="absolute rounded-xl border border-blue-100 bg-blue-50/30"
              style={{ left: x0, top: clusterStartY, width: clusterW, height: clusterContentH }}
            />
            {/* 오른쪽 열 구분선 (매칭 태그가 있을 때만) */}
            {matchedUserTags.length > 0 && (
              <div
                className="absolute border-l border-dashed border-blue-200"
                style={{ left: x0 + rightColX - CLUSTER_PAD, top: clusterStartY + CLUSTER_PAD, height: clusterContentH - CLUSTER_PAD * 2 }}
              />
            )}
            {/* 태그 칩들 */}
            {clusterChipPositions.map((pos, i) => {
              const isMatched = pos.isRight;
              return (
                <div
                  key={`utag-${i}`}
                  className="absolute flex items-center justify-center rounded-full border text-[10px] font-semibold overflow-hidden whitespace-nowrap"
                  style={{
                    left: x0 + pos.x,
                    top: clusterStartY + pos.y,
                    width: pos.w,
                    height: CLUSTER_CHIP_H,
                    background: isMatched ? "#ecfdf5" : USER_TAG_STYLE.bg,
                    borderColor: isMatched ? "#6ee7b7" : USER_TAG_STYLE.border,
                    color: isMatched ? "#059669" : USER_TAG_STYLE.text,
                  }}
                >
                  #{pos.tagName}
                </div>
              );
            })}
          </>
        )}

        {/* 도시 태그 칩 전체 (매칭=초록, softBridge=황색, 비매칭=회색) */}
        {allCityTags.map((ct) => {
          const isMatched = matchedCityTagNames.has(ct.name);
          const isSoft = !isMatched && softBridge?.cityTagName === ct.name;
          const cty = cityChipY[ct.name];
          return (
            <div
              key={`ctag-${ct.name}`}
              className="absolute flex items-center justify-center rounded-lg border text-[10px] font-semibold leading-none overflow-hidden"
              style={{
                left: x3, top: cty - CITY_CHIP_H / 2,
                width: CITY_TAG_COL_W, height: CITY_CHIP_H,
                background: isMatched ? "#ecfdf5" : isSoft ? "#fffbeb" : "#f8fafc",
                borderColor: isMatched ? "#6ee7b7" : isSoft ? "#fcd34d" : "#e2e8f0",
                color: isMatched ? "#059669" : isSoft ? "#b45309" : "#94a3b8",
              }}
            >
              <span className="truncate px-2 text-[12px]">
                {isMatched ? "✓ " : isSoft ? "~ " : ""}#{ct.name}
              </span>
            </div>
          );
        })}

        {/* 도시 이름 노드 */}
        <div
          className={`absolute flex flex-col items-center justify-center gap-0.5 rounded-xl border text-center px-2 ${
            matchedCityChipYs.length > 0
              ? "bg-emerald-500 border-emerald-600"
              : "bg-slate-100 border-slate-300"
          }`}
          style={{
            left: x4, top: cityNameY - 23,
            width: CITY_NAME_COL_W, height: 46,
          }}
        >
          <span className={`text-[14px] font-black leading-tight ${matchedCityChipYs.length > 0 ? "text-white" : "text-slate-400"}`}>
            {cityName}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── YoutubeTab ────────────────────────────────────────────────
export function YoutubeTab({ city }: { city: CityDetail }) {
  const { data: analysis, isLoading, isError } = useInterestAnalysis();
  const { data: tagList } = useTagList();
  const { data: memberTags } = useMemberTags();
  const { data: syncStatus } = useQuery({
    queryKey: ["youtube", "sync-status"],
    queryFn: youtubeApi.getSyncStatus,
    staleTime: 60 * 1000,
  });

  const syncEnabled = (syncStatus?.connected === true) && (syncStatus?.syncEnabled !== false);


  const relevantCityTags = city.tags ?? [];
  const cityTagNames = new Set(relevantCityTags.map((ct) => ct.name));

  const allTags = analysis?.tags ?? [];
  const topKeywords = analysis?.topKeywords ?? [];

  // isFromYoutube: false인 사용자 직접 입력 태그 → tagId로 TagItem 조회
  const youtubeTagNames = new Set(allTags.map((t) => t.tagName));
  const tagMap = new Map((tagList ?? []).map((t) => [t.tagId, t]));
  const userOnlyTags: TagItem[] = (memberTags ?? [])
    .filter((mt) => !mt.isFromYoutube)
    .map((mt) => tagMap.get(mt.tagId))
    .filter((t): t is TagItem => t != null && !youtubeTagNames.has(t.tagName));

  // 플로우 다이어그램용 도시 태그: top3 + 유튜브 매칭(무조건) + 사용자 입력 매칭(0.6 초과)
  const sortedCityTags = [...relevantCityTags]
    .filter((t) => (t.tagScore ?? 0) > 0.5)
    .sort((a, b) => (b.tagScore ?? 0) - (a.tagScore ?? 0));
  const cityTagScoreMap = new Map(sortedCityTags.map((t) => [t.name, t]));
  const top3Names = new Set(sortedCityTags.slice(0, 3).map((t) => t.name));
  const flowAnalysisMatchedNames = new Set(
    allTags
      .filter((t) => t.tagId != null && cityTagScoreMap.has(t.tagName))
      .map((t) => t.tagName),
  );
  const flowMemberMatchedNames = new Set(
    userOnlyTags
      .filter(
        (t) =>
          cityTagScoreMap.has(t.tagName) &&
          (cityTagScoreMap.get(t.tagName)!.tagScore ?? 0) > 0.6,
      )
      .map((t) => t.tagName),
  );
  const flowResultNames = new Set(top3Names);
  const flowExtra: typeof sortedCityTags = [];
  for (const name of [...flowAnalysisMatchedNames, ...flowMemberMatchedNames]) {
    if (!flowResultNames.has(name) && cityTagScoreMap.has(name)) {
      flowExtra.push(cityTagScoreMap.get(name)!);
      flowResultNames.add(name);
    }
  }
  const flowCityTags = [...sortedCityTags.slice(0, 3), ...flowExtra];

  // 다이어그램에서 실제 표시되는 도시 태그 이름 집합 (연결선/매칭 판단 기준)
  const flowCityTagNames = new Set(flowCityTags.map((t) => t.name));

  // matchedCount: 표시되는 도시 태그 기준으로 재계산
  const matchedCount = allTags.filter((t) => flowCityTagNames.has(t.tagName)).length;

  // Soft bridge: 직접 매칭 없을 때 스팟 태그 점수로 관심태그↔도시태그 연결
  const softBridge = (() => {
    if (matchedCount > 0) return undefined;
    if (!city.touristSpot?.length) return undefined;
    const spotTagScores: Record<string, number> = {};
    city.touristSpot.forEach((spot) => {
      spot.tags?.forEach((tag) => {
        if ((tag.tagScore ?? 0) > 0) {
          spotTagScores[tag.name] = (spotTagScores[tag.name] ?? 0) + (tag.tagScore ?? 0);
        }
      });
    });
    let best: { interestTagIdx: number; cityTagName: string } | null = null;
    let bestScore = 0;
    allTags.forEach((tag, idx) => {
      const spotScore = spotTagScores[tag.tagName] ?? 0;
      if (spotScore > 0 && flowCityTagNames.has(tag.tagName)) {
        const combined = (tag.score ?? 0) + spotScore;
        if (combined > bestScore) {
          bestScore = combined;
          best = { interestTagIdx: idx, cityTagName: tag.tagName };
        }
      }
    });
    return best ?? undefined;
  })();

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
        {isError
          ? <AlertCircle className="size-10 text-slate-300" />
          : <Tv2 className="size-10 text-slate-300" />
        }
        <p className="text-sm text-slate-400">
          {isError
            ? "YouTube 계정이 연동되지 않았습니다."
            : "아직 분석된 유튜브 취향 데이터가 없습니다."}
        </p>
        {isError && (
          <p className="text-xs text-slate-300">
            마이페이지에서 YouTube 계정을 연동해 주세요.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50/30">
      <section className="p-6 pb-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Tv2 className="size-5 text-red-500" aria-hidden="true" />
            유튜브 취향 분석
          </h2>
          {matchedCount > 0 && (
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              {matchedCount}개 도시 매칭
            </span>
          )}
        </div>

        {topKeywords.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              내 유튜브 주요 키워드
            </p>
            <KeywordCloud keywords={topKeywords} syncEnabled={syncEnabled} />
          </div>
        )}
      </section>

      <section className="p-6 pt-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
          취향 분석 흐름
        </p>
        <TagFlowDiagram
          tags={allTags}
          cityTagNames={flowCityTagNames}
          allCityTags={flowCityTags.map((ct) => ({ name: ct.name, tagScore: ct.tagScore }))}
          cityName={CITY_NAME_KO[city.cityName] ?? city.cityName}
          softBridge={softBridge}
          userTags={userOnlyTags}
          syncEnabled={syncEnabled}
        />
      </section>
    </div>
  );
}
