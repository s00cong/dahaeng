import { useEffect, useRef, useMemo, type JSX } from "react";
import { CITY_NAME_KO } from "@/data/cityNameKo";

// ── 상수 ─────────────────────────────────────────────────────────
const SEOUL: [number, number] = [126.978, 37.5665]; // [lon, lat]
const DURATION_MS = 8000;
const ARC_STEPS = 160;
const SVG_W = 800;
const SVG_H = 460;
const CX = SVG_W / 2; // 카메라 중심 X
const CY = SVG_H / 2; // 카메라 중심 Y
const PLANE_SIZE = 36;

// ── 좌표 유틸 ─────────────────────────────────────────────────────

/** 경위도 → 등장방형 월드 좌표 (픽셀) */
function project([lon, lat]: [number, number]): [number, number] {
  const x = ((lon + 180) / 360) * SVG_W;
  const y = ((90 - lat) / 180) * SVG_H;
  return [x, y];
}

/** 대권항로 포인트 계산 */
function buildArc(
  from: [number, number],
  to: [number, number],
  steps = ARC_STEPS,
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const [lng1, lat1] = [toRad(from[0]), toRad(from[1])];
  const [lng2, lat2] = [toRad(to[0]), toRad(to[1])];
  const x1 = Math.cos(lat1) * Math.cos(lng1), y1 = Math.cos(lat1) * Math.sin(lng1), z1 = Math.sin(lat1);
  const x2 = Math.cos(lat2) * Math.cos(lng2), y2 = Math.cos(lat2) * Math.sin(lng2), z2 = Math.sin(lat2);
  const dot = Math.min(1, Math.max(-1, x1 * x2 + y1 * y2 + z1 * z2));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return [from, to];
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const s = Math.sin(omega);
    const a = Math.sin((1 - t) * omega) / s;
    const b = Math.sin(t * omega) / s;
    pts.push([
      toDeg(Math.atan2(a * y1 + b * y2, a * x1 + b * x2)),
      toDeg(Math.asin(Math.max(-1, Math.min(1, a * z1 + b * z2)))),
    ]);
  }
  return pts;
}

/** 최고위도 압축 */
function limitPeak(pts: [number, number][], max = 68): [number, number][] {
  const peak = Math.max(...pts.map((p) => p[1]));
  if (peak <= max) return pts;
  const r = max / peak;
  return pts.map(([lng, lat]) => [lng, lat > 0 ? lat * r : lat]);
}

/** 경도 연속화 */
function normalizeLon(pts: [number, number][]): [number, number][] {
  if (pts.length <= 1) return pts;
  const res: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    let lng = pts[i][0];
    const prev = res[i - 1][0];
    while (lng - prev > 180) lng -= 360;
    while (lng - prev < -180) lng += 360;
    res.push([lng, pts[i][1]]);
  }
  return res;
}

/** SVG 좌표 방위각 */
function bearing(a: [number, number], b: [number, number]): number {
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI + 90;
}

const PLANE_PATH =
  "M12 2c-.6 0-1 .4-1 1v7.3L4 14v2l7-2v4.2l-2 1.3V21l3-.8 3 .8v-1.5l-2-1.3V14l7 2v-2l-7-3.7V3c0-.6-.4-1-1-1z";

// ── 컴포넌트 ──────────────────────────────────────────────────────

interface FlightLoadingOverlayProps {
  destLon: number;
  destLat: number;
  destName: string;
}

export function FlightLoadingOverlay({
  destLon,
  destLat,
  destName,
}: FlightLoadingOverlayProps) {
  const worldRef   = useRef<SVGGElement>(null);  // 세계 전체 (카메라 오프셋 적용)
  const trailRef   = useRef<SVGPathElement>(null);
  const planeRef   = useRef<SVGGElement>(null);  // 비행기 (항상 중앙 고정)
  const progressRef = useRef<HTMLDivElement>(null);
  const animRef    = useRef<number | null>(null);
  const startRef   = useRef<number | null>(null);

  const destNameKo = CITY_NAME_KO[destName] ?? destName;

  const { arcSvgPoints, fullPathD, seoulSvg, destSvg } = useMemo(() => {
    const dest: [number, number] = [destLon, destLat];
    let raw = buildArc(SEOUL, dest, ARC_STEPS);
    raw = limitPeak(raw);
    raw = normalizeLon(raw);
    const svgPts = raw.map(project);
    const pathD = svgPts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
      .join(" ");
    return {
      arcSvgPoints: svgPts,
      fullPathD: pathD,
      seoulSvg: project(SEOUL),
      destSvg: project(dest),
    };
  }, [destLon, destLat]);

  useEffect(() => {
    const world   = worldRef.current;
    const trail   = trailRef.current;
    const plane   = planeRef.current;
    const progEl  = progressRef.current;
    if (!world || !plane || !arcSvgPoints.length) return;

    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = ((ts - startRef.current) % DURATION_MS) / DURATION_MS;

      // ── 현재 비행기 위치 보간 ──
      const rawIdx = t * (arcSvgPoints.length - 1);
      const i0 = Math.floor(rawIdx);
      const i1 = Math.min(i0 + 1, arcSvgPoints.length - 1);
      const frac = rawIdx - i0;
      const px = arcSvgPoints[i0][0] + (arcSvgPoints[i1][0] - arcSvgPoints[i0][0]) * frac;
      const py = arcSvgPoints[i0][1] + (arcSvgPoints[i1][1] - arcSvgPoints[i0][1]) * frac;

      // ── 카메라: 세계를 반대로 이동해서 비행기가 항상 중앙에 오도록 ──
      const ox = CX - px;
      const oy = CY - py;
      world.setAttribute("transform", `translate(${ox.toFixed(1)},${oy.toFixed(1)})`);

      // ── 비행기 방위각 (항상 화면 중앙에 고정, 회전만 변경) ──
      const nextPt = arcSvgPoints[Math.min(i1 + 1, arcSvgPoints.length - 1)];
      const deg = bearing([px, py], nextPt);
      plane.setAttribute(
        "transform",
        `translate(${(CX - PLANE_SIZE / 2).toFixed(1)},${(CY - PLANE_SIZE / 2).toFixed(1)}) rotate(${deg.toFixed(1)},${PLANE_SIZE / 2},${PLANE_SIZE / 2})`,
      );

      // ── 트레일: 현재까지 지나온 경로 (월드 좌표계 → 세계 group 안에 있음) ──
      if (trail) {
        const n = Math.max(2, Math.ceil(t * arcSvgPoints.length));
        trail.setAttribute(
          "d",
          arcSvgPoints
            .slice(0, n)
            .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
            .join(" "),
        );
      }

      // ── 진행바 ──
      if (progEl) progEl.style.width = `${(t * 100).toFixed(1)}%`;

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      startRef.current = null;
    };
  }, [arcSvgPoints]);

  // 격자선: 카메라가 이동해도 항상 화면을 채우도록 월드 좌표 3배 범위
  const gridLines: JSX.Element[] = [];
  for (let lat = -90; lat <= 90; lat += 15) {
    const [, y] = project([0, lat]);
    gridLines.push(
      <line key={`lat${lat}`} x1={-SVG_W} y1={y} x2={SVG_W * 2} y2={y}
        stroke="rgba(148,163,184,0.08)" strokeWidth={lat === 0 ? 1.5 : 1} />,
    );
  }
  for (let lon = -360; lon <= 360; lon += 15) {
    const [x] = project([lon, 0]);
    gridLines.push(
      <line key={`lon${lon}`} x1={x} y1={-SVG_H} x2={x} y2={SVG_H * 2}
        stroke="rgba(148,163,184,0.08)" strokeWidth={lon === 0 ? 1.5 : 1} />,
    );
  }

  const [sx, sy] = seoulSvg;
  const [dx, dy] = destSvg;

  return (
    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-[#060d1f] via-[#0a1628] to-[#060d1f] rounded-2xl overflow-hidden">

      {/* SVG 지도 영역 */}
      <div className="relative flex-1 overflow-hidden">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-full"
          style={{ display: "block" }}
        >
          <defs>
            {/* 중앙 방사형 그라디언트 — 가장자리를 어둡게 */}
            <radialGradient id="vignette" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="100%" stopColor="#060d1f" stopOpacity="0.85" />
            </radialGradient>
            {/* 비행기 글로우 */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* 도시 점 글로우 */}
            <filter id="cityGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* ── 세계 그룹 (카메라 오프셋으로 이동) ── */}
          <g ref={worldRef}>
            {/* 격자 */}
            {gridLines}

            {/* 전체 항로 점선 */}
            <path
              d={fullPathD}
              fill="none"
              stroke="rgba(96,165,250,0.2)"
              strokeWidth={1.5}
              strokeDasharray="7 5"
            />

            {/* 지나온 트레일 */}
            <path
              ref={trailRef}
              d=""
              fill="none"
              stroke="url(#trailGrad)"
              strokeWidth={2.5}
              strokeLinecap="round"
              opacity={0.9}
            />

            {/* 서울 도시 점 */}
            <circle cx={sx} cy={sy} r={16} fill="rgba(251,191,36,0.12)" filter="url(#cityGlow)" />
            <circle cx={sx} cy={sy} r={5}  fill="#fbbf24" />
            <circle cx={sx} cy={sy} r={2.5} fill="white" />
            <text x={sx + 9} y={sy - 10} fill="#fcd34d" fontSize={12} fontWeight="bold" fontFamily="sans-serif">
              서울 (ICN)
            </text>

            {/* 목적지 도시 점 */}
            <circle cx={dx} cy={dy} r={16} fill="rgba(52,211,153,0.12)" filter="url(#cityGlow)" />
            <circle cx={dx} cy={dy} r={5}  fill="#34d399" />
            <circle cx={dx} cy={dy} r={2.5} fill="white" />
            <text
              x={dx + 9} y={dy - 10}
              fill="#6ee7b7" fontSize={12} fontWeight="bold" fontFamily="sans-serif"
            >
              {destNameKo}
            </text>
          </g>

          {/* ── 트레일 그라디언트 (defs 안에 있어야 하지만 worldRef 안은 아님) ── */}
          <defs>
            <linearGradient id="trailGrad" gradientUnits="userSpaceOnUse"
              x1={seoulSvg[0]} y1={seoulSvg[1]}
              x2={destSvg[0]}  y2={destSvg[1]}>
              <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="1" />
            </linearGradient>
          </defs>

          {/* ── 비행기 (항상 화면 중앙 고정, 월드와 독립) ── */}
          <g ref={planeRef} style={{ willChange: "transform" }} filter="url(#glow)">
            {/* 외곽 글로우 링 */}
            <circle cx={PLANE_SIZE / 2} cy={PLANE_SIZE / 2} r={20}
              fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.2)" strokeWidth={1} />
            <circle cx={PLANE_SIZE / 2} cy={PLANE_SIZE / 2} r={14}
              fill="rgba(251,191,36,0.15)" />
            {/* 비행기 아이콘 */}
            <svg x={4} y={4} width={PLANE_SIZE - 8} height={PLANE_SIZE - 8} viewBox="0 0 24 24">
              <path d={PLANE_PATH} fill="#facc15" stroke="#1e293b" strokeWidth={0.6} />
            </svg>
          </g>

          {/* 십자선 (조준경 느낌) */}
          <g opacity={0.18} stroke="#60a5fa" strokeWidth={0.8}>
            <line x1={CX - 28} y1={CY} x2={CX - 16} y2={CY} />
            <line x1={CX + 16} y1={CY} x2={CX + 28} y2={CY} />
            <line x1={CX} y1={CY - 28} x2={CX} y2={CY - 16} />
            <line x1={CX} y1={CY + 16} x2={CX} y2={CY + 28} />
            <circle cx={CX} cy={CY} r={30} fill="none" />
          </g>

          {/* 비네트 */}
          <rect width={SVG_W} height={SVG_H} fill="url(#vignette)" />
        </svg>
      </div>

      {/* 하단 패널 */}
      <div className="shrink-0 px-8 py-4 flex flex-col gap-2.5 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-300 animate-pulse">
            서울 → {destNameKo} 맞춤 일정 분석 중...
          </span>
          <span className="text-[11px] text-slate-500">AI 추천 계산 중</span>
        </div>
        <div className="w-full h-1 bg-white/8 rounded-full overflow-hidden">
          <div
            ref={progressRef}
            className="h-full bg-gradient-to-r from-amber-400 via-blue-400 to-emerald-400 rounded-full"
            style={{ width: "0%", transition: "none" }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-600">
          <span>출발: 서울 인천국제공항 (ICN)</span>
          <span>도착: {destNameKo}</span>
        </div>
      </div>
    </div>
  );
}
