import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { animate } from "framer-motion";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { useUiStore } from "@/stores/uiStore";
import { useCityList } from "@/hooks/city/useCityList";
import { COUNTRY_NAME_KO } from "@/data/countryNameKo";
import { COUNTRY_NAME_ISO3 } from "@/data/countryNameIso3";
import React from "react";
import medal1Img from "@/assets/medal1.png";
import medal2Img from "@/assets/medal2.png";
import medal3Img from "@/assets/medal3.png";

const MEDAL_IMGS: Record<1 | 2 | 3, string> = {
  1: medal1Img,
  2: medal2Img,
  3: medal3Img,
};

// 베이스 지도: 로컬 50m (public/geo/ — CDN 대신 로컬 서버에서 로드)
// admin-1: 클릭된 나라의 /geo/{ISO3}.json (10m, lazy load)
const GEO_URL = "/geo/countries-50m.json";
const LAND_URL = "/geo/land-50m.json";

// ── 모듈 레벨 캐시 ────────────────────────────────────────────────────────────
// 컴포넌트가 언마운트되어도 이 변수는 살아있음 → 재마운트 시 즉시 사용
const geoCache = new Map<string, object>();

async function fetchGeoWithCache(url: string): Promise<object> {
  const cached = geoCache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  const data = await res.json();
  geoCache.set(url, data);
  return data;
}

// 줌 임계값
const ZOOM_SHOW_BORDERS = 1.5; // 이상: 나라 경계선 표시 (나라 미선택 시)

interface GlobeViewerProps {
  width: number;
  height: number;
}

type GeoFeature = {
  rsmKey: string;
  properties: {
    name?: string;
    name_en?: string;
    admin?: string;
    iso_a2?: string;
    postal?: string;
    shapeName?: string;
    shapeISO?: string;
    shapeGroup?: string;
  };
  geometry: {
    type: string;
    coordinates: unknown[];
  };
};

function getGeoBounds(geo: GeoFeature) {
  const coords: [number, number][] = [];
  const geom = geo.geometry;

  if (geom.type === "Polygon") {
    (geom.coordinates[0] as [number, number][]).forEach((c) => coords.push(c));
  } else if (geom.type === "MultiPolygon") {
    (geom.coordinates as [number, number][][][]).forEach((poly) =>
      poly[0].forEach((c) => coords.push(c)),
    );
  }

  if (!coords.length) return null;

  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);

  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  return {
    minLng,
    maxLng,
    minLat,
    maxLat,
    width: maxLng - minLng,
    height: maxLat - minLat,
  };
}

// 바운딩박스가 너무 넓어지는 나라의 메인 대륙 bbox 오버라이드
// Russia만 사용 — France/USA는 폴리곤 분리 방식으로 처리
const COUNTRY_MAIN_BBOX: Record<
  string,
  {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
    width: number;
    height: number;
  }
> = {
  // 러시아: 유럽~시베리아~극동 본토 (쿠릴·사할린 등 동쪽 섬 제외)
  Russia: {
    minLng: 19,
    maxLng: 170,
    minLat: 41,
    maxLat: 82,
    width: 151,
    height: 41,
  },
};

// MultiPolygon 나라에서 클릭 지점에 가장 가까운 서브 폴리곤의 bbox 반환
// (마우스 좌표 역투영 → 어느 대륙/영토를 클릭했는지 판별)
const POLYGON_LEVEL_CLICK = new Set([
  "France",
  "United States of America",
  "Netherlands",
  "New Zealand",
]);

type SubregionEntry = {
  detectLng: [number, number];
  detectLat: [number, number];
  viewBbox: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
    width: number;
    height: number;
  };
};

// POLYGON_LEVEL_CLICK 나라에서 screenToGeo 결과를 이 테이블에 먼저 대조
// → 매핑된 나라는 고정 bbox로 줌 (findSubPolygonBbox 대신)
// 배열 순서 = 우선순위 (앞에서부터 첫 매칭 사용)
const SUBREGION_BBOX: Record<string, SubregionEntry[]> = {
  "New Zealand": [
    // 1. 북섬 (North Island) — lat -34 ~ -42, lng 172 ~ 179
    {
      detectLng: [172, 179],
      detectLat: [-42, -34],
      viewBbox: {
        minLng: 172.5,
        maxLng: 178.6,
        minLat: -41.7,
        maxLat: -34.3,
        width: 6.1,
        height: 7.4,
      },
    },
    // 2. 남섬 + 스튜어트 섬 (South Island + Stewart) — lat -48 ~ -40, lng 165 ~ 174
    {
      detectLng: [165, 174],
      detectLat: [-48, -40],
      viewBbox: {
        minLng: 165.8,
        maxLng: 173.9,
        minLat: -47.4,
        maxLat: -40.4,
        width: 8.1,
        height: 7.0,
      },
    },
  ],
  "United States of America": [
    // 1. 하와이
    {
      detectLng: [-162, -154],
      detectLat: [18, 24],
      viewBbox: {
        minLng: -162,
        maxLng: -154,
        minLat: 18,
        maxLat: 23,
        width: 8,
        height: 5,
      },
    },
    // 2. 알류산 열도 — 실제 열도는 서경 165° 이서, 위도 51–56°
    //    (알래스카 반도 lat 54–58 과 겹치지 않도록 lng < -165 으로 좁힘)
    {
      detectLng: [-181, -165],
      detectLat: [51, 56],
      viewBbox: {
        minLng: -180,
        maxLng: -163,
        minLat: 51,
        maxLat: 56,
        width: 17,
        height: 5,
      },
    },
    // 3. 알래스카 본토 (반도 포함, lat 54–72)
    {
      detectLng: [-170, -129],
      detectLat: [54, 72],
      viewBbox: {
        minLng: -170,
        maxLng: -129,
        minLat: 54,
        maxLat: 72,
        width: 41,
        height: 18,
      },
    },
    // 4. 미국 본토 (lower 48)
    {
      detectLng: [-126, -65],
      detectLat: [24, 50],
      viewBbox: {
        minLng: -126,
        maxLng: -65,
        minLat: 24,
        maxLat: 50,
        width: 61,
        height: 26,
      },
    },
  ],
};

// Mercator 역투영: 화면 좌표 → 지리 좌표
// scale = width/7, ZoomableGroup center/zoom 고려
function screenToGeo(
  clientX: number,
  clientY: number,
  svgEl: Element,
  mapWidth: number,
  mapHeight: number,
  center: [number, number],
  zoom: number,
): [number, number] {
  const rect = svgEl.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  // 경도 (Mercator 선형 축)
  const lng =
    center[0] + ((sx - mapWidth / 2) * 7 * 180) / (zoom * Math.PI * mapWidth);
  // 위도 (Mercator 비선형 축)
  const cy = center[1] * (Math.PI / 180);
  const lat =
    (2 *
      Math.atan(
        Math.tan(Math.PI / 4 + cy / 2) *
          Math.exp(-((sy - mapHeight / 2) * 7) / (zoom * mapWidth)),
      ) -
      Math.PI / 2) *
    (180 / Math.PI);
  return [lng, lat];
}

// MultiPolygon 에서 (lng, lat)을 포함하는 폴리곤의 bbox 반환
// 포함하는 게 없으면 중심이 가장 가까운 폴리곤의 bbox 반환
//
// 선택 우선순위:
//   1. 클릭 포함 + 면적 >= MIN_SUBPOLY_AREA → 그 중 가장 작은 것
//      (알래스카 본토 > 알류샨 열도 개별 섬 → 본토 선택)
//   2. 클릭 포함 + 면적 < MIN_SUBPOLY_AREA (소형 섬) → 그 중 가장 작은 것
//      (1 후보 없을 때만 사용: 아루바 같은 초소형 도서 영토 클릭)
//   3. 클릭 미포함 → 중심이 가장 가까운 폴리곤 (최종 fallback)
const MIN_SUBPOLY_AREA = 5; // sq degrees — 알류샨 열도 개별 섬 < 0.1, 프랑스령 기아나 ~9.5

function findSubPolygonBbox(
  geo: GeoFeature,
  lng: number,
  lat: number,
): { minLng: number; maxLng: number; minLat: number; maxLat: number } | null {
  if (geo.geometry.type !== "MultiPolygon") return getGeoBounds(geo);
  const polygons = geo.geometry.coordinates as [number, number][][][];

  // 1순위: 클릭 포함 + 충분히 큰 폴리곤 (가장 작은 것)
  let primaryBbox: ReturnType<typeof getGeoBounds> = null;
  let primaryArea = Infinity;
  // 2순위: 클릭 포함 + 소형 섬 폴리곤 (가장 작은 것)
  let smallBbox: ReturnType<typeof getGeoBounds> = null;
  let smallArea = Infinity;
  // 3순위: 클릭 미포함 → 가장 가까운 중심
  let fallbackBbox: ReturnType<typeof getGeoBounds> = null;
  let fallbackDist = Infinity;

  for (const poly of polygons) {
    const outer = poly[0] as [number, number][];
    const lngs = outer.map((c) => c[0]);
    const lats = outer.map((c) => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const area = (maxLng - minLng) * (maxLat - minLat);
    const bbox = {
      minLng,
      maxLng,
      minLat,
      maxLat,
      width: maxLng - minLng,
      height: maxLat - minLat,
    };

    if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
      if (area >= MIN_SUBPOLY_AREA) {
        if (area < primaryArea) {
          primaryArea = area;
          primaryBbox = bbox;
        }
      } else {
        if (area < smallArea) {
          smallArea = area;
          smallBbox = bbox;
        }
      }
    } else {
      const dist = Math.hypot(
        lng - (minLng + maxLng) / 2,
        lat - (minLat + maxLat) / 2,
      );
      if (dist < fallbackDist) {
        fallbackDist = dist;
        fallbackBbox = bbox;
      }
    }
  }

  return primaryBbox ?? smallBbox ?? fallbackBbox;
}

function calcCountryView(
  minLng: number,
  maxLng: number,
  minLat: number,
  maxLat: number,
  width: number,
  height: number,
): { center: [number, number]; zoom: number } {
  const center: [number, number] = [
    (minLng + maxLng) / 2,
    (minLat + maxLat) / 2,
  ];
  const dLng = Math.max(maxLng - minLng, 1);
  const dLat = Math.max(maxLat - minLat, 1);
  const zoomLng = (360 / dLng) * 0.65;
  const zoomLat = (180 / dLat) * (height / width) * 0.65;
  const zoom = Math.min(Math.min(zoomLng, zoomLat), 16);
  return { center, zoom };
}

function getMarkerColor(score: number | null | undefined): string {
  if (score == null) return "#3b82f6";
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#3b82f6";
  return "#f59e0b";
}

// ── 지도 색상 중앙 관리 ──────────────────────────────────────────────────────
const MAP_COLORS = {
  countryDefault: "#F1F5F9",
  countryHover: "#e2e8ef",
  countrySelected: "#e2e8ef", // 나라 상면
  countrySelectedSide1: "#c8d2db", // 옆면 상단 레이어
  countrySelectedSide2: "#a8b6c2", // 옆면 하단 레이어
  countrySelectedShadow: "rgba(0,0,0,0.18)", // 바닥 그림자
} as const;

const COUNTRY_STYLE_DEFAULT = {
  outline: "none",
  vectorEffect: "non-scaling-stroke" as const,
};
const COUNTRY_STYLE_PRESSED = { outline: "none" };

// 선택 나라의 3D 그림자 필터 생성

const BaseLayer = React.memo(
  ({
    geography,
    clickedName,
    showBorders,
    onCountryClick,
    onEnter,
    onMove,
    onLeave,
    zoom,
    onLoad,
  }: {
    geography: string | object;
    clickedName: string | null;
    showBorders: boolean;
    onCountryClick: (geo: GeoFeature, e: React.MouseEvent) => void;
    onEnter: (name: string, e: React.MouseEvent) => void;
    onMove: (name: string, e: React.MouseEvent) => void;
    onLeave: () => void;
    zoom: number;
    onLoad?: (geos: GeoFeature[]) => void;
  }) => {
    // 3D 효과 계산: 줌에 따라 돌출 정도를 조절
    const visualHeight = 7 / Math.pow(zoom, 0.45);
    const totalH = visualHeight / zoom;
    const xOffset = totalH * 0.45;
    const yOffset = -totalH;
    const sideLayersCount = 12; // 더 매끄러운 옆면을 위해 레이어 수 증가

    return (
      <Geographies geography={geography}>
        {({ geographies }: { geographies: GeoFeature[] }) => {
          if (onLoad && geographies.length > 0) onLoad(geographies);
          const nonSelected = geographies.filter(
            (geo) => (geo.properties.name ?? "") !== clickedName,
          );
          const selected = geographies.filter(
            (geo) => (geo.properties.name ?? "") === clickedName,
          );
          return (
            <>
              {/* 선택되지 않은 나라 먼저 렌더 */}
              {nonSelected.map((geo) => {
                const rawName = geo.properties.name ?? "";
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    tabIndex={-1}
                    fill={MAP_COLORS.countryDefault}
                    stroke={showBorders ? "#cfcfcf" : "none"}
                    strokeWidth={showBorders ? 0.5 : 0}
                    style={{
                      default: COUNTRY_STYLE_DEFAULT,
                      hover: {
                        fill: MAP_COLORS.countryHover,
                        outline: "none",
                        cursor: "pointer",
                        vectorEffect: "non-scaling-stroke" as const,
                      },
                      pressed: COUNTRY_STYLE_PRESSED,
                    }}
                    onClick={(e) => onCountryClick(geo, e)}
                    onMouseEnter={(e) => onEnter(rawName, e)}
                    onMouseMove={(e) => onMove(rawName, e)}
                    onMouseLeave={onLeave}
                  />
                );
              })}
              {/* 선택된 나라 — 3D 레이어링 */}
              {selected.map((geo) => {
                const rawName = geo.properties.name ?? "";
                return (
                  <g key={`3d-${geo.rsmKey}`}>
                    {/* 바닥 그림자 */}
                    <Geography
                      geography={geo}
                      fill={MAP_COLORS.countrySelectedShadow}
                      stroke="none"
                      style={{ default: { pointerEvents: "none" } }}
                      transform={`translate(${xOffset * 0.4}, ${-yOffset * 0.4})`}
                    />
                    {/* 옆면 레이어 (부드러운 그라데이션 효과) */}
                    {[...Array(sideLayersCount)].map((_, i) => {
                      const ratio = (i + 1) / (sideLayersCount + 1);
                      const curX = xOffset * ratio;
                      const curY = yOffset * ratio;

                      // 색상 보간: #a8b6c2 -> 상면 색상(#e2e8ef)
                      const startRGB = [168, 182, 194];
                      const endRGB = [226, 232, 239];
                      const r = Math.round(
                        startRGB[0] + (endRGB[0] - startRGB[0]) * ratio,
                      );
                      const g = Math.round(
                        startRGB[1] + (endRGB[1] - startRGB[1]) * ratio,
                      );
                      const b = Math.round(
                        startRGB[2] + (endRGB[2] - startRGB[2]) * ratio,
                      );
                      const color = `rgb(${r},${g},${b})`;

                      return (
                        <Geography
                          key={`side-${i}`}
                          geography={geo}
                          fill={color}
                          stroke={color} // 레이어 사이의 미세한 틈새 방지
                          strokeWidth={0.2 / zoom}
                          style={{ default: { pointerEvents: "none" } }}
                          transform={`translate(${curX}, ${curY})`}
                        />
                      );
                    })}
                    {/* 상면 (실제 클릭 가능한 표면) */}
                    <Geography
                      geography={geo}
                      tabIndex={-1}
                      fill={MAP_COLORS.countrySelected}
                      stroke={MAP_COLORS.countrySelected} // 상면 테두리 정돈
                      strokeWidth={0.2 / zoom}
                      style={{
                        default: {
                          outline: "none",
                          vectorEffect: "non-scaling-stroke" as const,
                        },
                        hover: {
                          fill: MAP_COLORS.countrySelected,
                          outline: "none",
                          cursor: "pointer",
                          vectorEffect: "non-scaling-stroke" as const,
                        },
                        pressed: COUNTRY_STYLE_PRESSED,
                      }}
                      transform={`translate(${xOffset}, ${yOffset})`}
                      onClick={(e) => onCountryClick(geo, e)}
                      onMouseEnter={(e) => onEnter(rawName, e)}
                      onMouseMove={(e) => onMove(rawName, e)}
                      onMouseLeave={onLeave}
                    />
                  </g>
                );
              })}
            </>
          );
        }}
      </Geographies>
    );
  },
);

// 모든 국가 GeoJSON이 mapshaper 5% simplify 처리됨
function getAdminUrl(iso: string) {
  return `/geo_10m/countries/${iso}.topo.json`;
}

function getAdminName(geo: GeoFeature) {
  return (
    geo.properties.shapeName ||
    geo.properties.name ||
    geo.properties.name_en ||
    geo.properties.admin ||
    geo.properties.postal ||
    "unknown"
  );
}

const ADMIN_AREA_STYLE = {
  default: { outline: "none", cursor: "pointer" },
  hover: { outline: "none", cursor: "pointer" },
  pressed: { outline: "none" },
} as const;

const ADMIN_BORDER_STYLE = {
  default: { outline: "none", pointerEvents: "none" },
  hover: { outline: "none" },
  pressed: { outline: "none" },
} as const;

const AdminLayer = React.memo(
  ({
    iso,
    hoveredAdminKey,
    onAdminEnter,
    onAdminMove,
    onAdminLeave,
    onDeselect,
  }: {
    iso: string;
    hoveredAdminKey: string | null;
    onAdminEnter: (name: string, key: string, e: React.MouseEvent) => void;
    onAdminMove: (name: string, key: string, e: React.MouseEvent) => void;
    onAdminLeave: () => void;
    onDeselect: () => void;
  }) => (
    <Geographies geography={getAdminUrl(iso)}>
      {
        (({
          geographies,
          borders,
          outline,
        }: {
          geographies: GeoFeature[];
          borders?: unknown;
          outline?: unknown;
        }) => (
          <>
            {geographies.map((geo: GeoFeature) => {
              const adminName = getAdminName(geo);
              const isHovered = hoveredAdminKey === geo.rsmKey;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={
                    isHovered ? "rgba(99, 179, 237, 0.3)" : "rgba(0,0,0,0.001)"
                  }
                  stroke="none"
                  style={ADMIN_AREA_STYLE}
                  onClick={onDeselect}
                  onMouseEnter={(e) => onAdminEnter(adminName, geo.rsmKey, e)}
                  onMouseMove={(e) => onAdminMove(adminName, geo.rsmKey, e)}
                  onMouseLeave={onAdminLeave}
                />
              );
            })}

            {outline && (
              <Geography
                geography={outline as never}
                fill="none"
                stroke="#b0bfcc"
                strokeWidth={0.1}
                style={ADMIN_BORDER_STYLE}
              />
            )}

            {borders && (
              <Geography
                geography={borders as never}
                fill="none"
                stroke="#b0bfcc"
                strokeWidth={0.1}
                style={ADMIN_BORDER_STYLE}
              />
            )}
          </>
        )) as never
      }
    </Geographies>
  ),
);

export function GlobeViewer({ width, height }: GlobeViewerProps) {
  const {
    openRightPanel,
    globeBudgetFilter,
    globeDuration,
    selectedCityCoords,
    selectedCityId,
    selectedCityScore,
    isRecommendActive,
    recommendResults,
    globeCountryTarget,
    setGlobeCountryTarget,
  } = useUiStore();

  // ── 지도 데이터 캐시 state ─────────────────────────────
  // 모듈 캐시에 이미 있으면 즉시 사용 (재마운트 시 fetch 없이 바로 렌더)
  const [geoData, setGeoData] = useState<object | null>(
    () => geoCache.get(GEO_URL) ?? null,
  );
  const [landData, setLandData] = useState<object | null>(
    () => geoCache.get(LAND_URL) ?? null,
  );

  useEffect(() => {
    if (!geoData) fetchGeoWithCache(GEO_URL).then(setGeoData);
    if (!landData) fetchGeoWithCache(LAND_URL).then(setLandData);
  }, []);

  // ── state ──────────────────────────────────────────────
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [zoom, setZoom] = useState(1);
  const [tooltip, setTooltip] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const [clickedIso, setClickedIso] = useState<string | null>(null);
  const [clickedName, setClickedName] = useState<string | null>(null);
  const [clickedGeo, setClickedGeo] = useState<GeoFeature | null>(null);

  const [hoveredAdminKey, setHoveredAdminKey] = useState<string | null>(null);

  // 1순위: 줌 애니메이션 중 admin 렌더 차단
  const [isZooming, setIsZooming] = useState(false);

  // ── refs ───────────────────────────────────────────────
  const centerRef = useRef<[number, number]>([0, 20]);
  const zoomRef = useRef(1);
  const tooltipThrottleRef = useRef<number>(0);
  const clickedNameRef = useRef<string | null>(null);
  clickedNameRef.current = clickedName; // 매 렌더마다 동기화
  // 줌 애니메이션 컨트롤 ref (중복 클릭 시 이전 애니메이션 취소)
  const animControlsRef = useRef<{ stop: () => void } | null>(null);
  // SVG 역투영용 컨테이너 ref
  const containerRef = useRef<HTMLDivElement>(null);
  // BaseLayer에서 파싱된 geographies 캐시 (나라 검색 카메라 이동용)
  const geographiesRef = useRef<GeoFeature[]>([]);

  // ── 파생값 ─────────────────────────────────────────────
  const showBorders = zoom >= ZOOM_SHOW_BORDERS;
  // 1순위: 줌 중이면 admin 렌더 차단 (줌 완료 후 표시)
  const showAdmin = !!clickedIso && !isZooming;

  // ── 콜백 ───────────────────────────────────────────────
  const handleTooltipMove = useCallback((name: string, e: React.MouseEvent) => {
    const now = Date.now();
    if (now - tooltipThrottleRef.current < 32) return;
    tooltipThrottleRef.current = now;
    setTooltip({ name, x: e.clientX, y: e.clientY });
  }, []);

  const handleEnter = useCallback((rawName: string, e: React.MouseEvent) => {
    setTooltip({
      name: COUNTRY_NAME_KO[rawName] ?? rawName,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  const handleLeave = useCallback(() => setTooltip(null), []);

  const handleMove = useCallback(
    (rawName: string, e: React.MouseEvent) => {
      handleTooltipMove(COUNTRY_NAME_KO[rawName] ?? rawName, e);
    },
    [handleTooltipMove],
  );

  const handleAdminEnter = useCallback(
    (name: string, key: string, e: React.MouseEvent) => {
      setHoveredAdminKey(key);
      setTooltip({
        name,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [],
  );

  const handleAdminMove = useCallback(
    (name: string, key: string, e: React.MouseEvent) => {
      setHoveredAdminKey(key);
      handleTooltipMove(name, e);
    },
    [handleTooltipMove],
  );

  const handleAdminLeave = useCallback(() => {
    setHoveredAdminKey(null);
    setTooltip(null);
  }, []);

  const handleDeselect = useCallback(() => {
    setClickedIso(null);
    setClickedName(null);
    setClickedGeo(null);
    setHoveredAdminKey(null);
    setTooltip(null);
  }, []);

  const handleCountryClick = useCallback(
    (geo: GeoFeature, e: React.MouseEvent) => {
      const rawName = geo.properties.name ?? "";

      if (rawName === clickedNameRef.current) {
        setClickedIso(null);
        setClickedName(null);
        setClickedGeo(null);
        setHoveredAdminKey(null);
        setTooltip(null);
        return;
      }

      // POLYGON_LEVEL_CLICK 나라는 마우스 좌표를 역투영해 어느 폴리곤인지 판별
      let bounds: {
        minLng: number;
        maxLng: number;
        minLat: number;
        maxLat: number;
      } | null;
      if (POLYGON_LEVEL_CLICK.has(rawName)) {
        const svgEl = containerRef.current?.querySelector("svg");
        if (svgEl) {
          const [rawLng, lat] = screenToGeo(
            e.clientX,
            e.clientY,
            svgEl,
            width,
            height,
            centerRef.current,
            zoomRef.current,
          );
          // 오프셋 타일 클릭 시 경도가 [-180,180] 밖으로 벗어나므로 정규화
          // 예: 러시아 오른쪽 알래스카 클릭 → rawLng ≈ 200 → 정규화 → -160
          const lng = ((((rawLng + 180) % 360) + 360) % 360) - 180;
          // 고정 서브리전 테이블 우선 확인 (USA 4구역 등)
          const subregions = SUBREGION_BBOX[rawName];
          const matched = subregions?.find(
            (r) =>
              lng >= r.detectLng[0] &&
              lng <= r.detectLng[1] &&
              lat >= r.detectLat[0] &&
              lat <= r.detectLat[1],
          );
          bounds = matched
            ? matched.viewBbox
            : findSubPolygonBbox(geo, lng, lat);
        } else {
          bounds = getGeoBounds(geo);
        }
      } else {
        bounds = COUNTRY_MAIN_BBOX[rawName] ?? getGeoBounds(geo);
      }
      if (!bounds) return;

      const iso = COUNTRY_NAME_ISO3[rawName];
      if (iso) setClickedIso(iso);
      setClickedName(rawName);
      setClickedGeo(geo);
      setHoveredAdminKey(null);
      setTooltip(null);

      setIsZooming(true);

      const { center: newCenter, zoom: newZoom } = calcCountryView(
        bounds.minLng,
        bounds.maxLng,
        bounds.minLat,
        bounds.maxLat,
        width,
        height,
      );

      const currentLng = centerRef.current[0];
      const diff =
        ((((newCenter[0] - currentLng + 180) % 360) + 360) % 360) - 180;

      const targetCenter: [number, number] = [currentLng + diff, newCenter[1]];

      // 이전 애니메이션 취소
      if (animControlsRef.current) animControlsRef.current.stop();

      const fromCenter: [number, number] = [...centerRef.current];
      const fromZoom = zoomRef.current;

      const controls = animate(0, 1, {
        duration: 0.85,
        ease: "easeInOut",
        onUpdate: (t) => {
          const animCenter: [number, number] = [
            fromCenter[0] + (targetCenter[0] - fromCenter[0]) * t,
            fromCenter[1] + (targetCenter[1] - fromCenter[1]) * t,
          ];
          const animZoom = fromZoom + (newZoom - fromZoom) * t;
          centerRef.current = animCenter;
          zoomRef.current = animZoom;
          setCenter([...animCenter]);
          setZoom(animZoom);
        },
        onComplete: () => {
          centerRef.current = targetCenter;
          zoomRef.current = newZoom;
          setCenter(targetCenter);
          setZoom(newZoom);
          setIsZooming(false);
        },
      });
      animControlsRef.current = controls;
    },
    [width, height],
  );

  useEffect(() => {
    if (!selectedCityCoords) return;
    const [fromLng, fromLat] = centerRef.current;
    const toLng = selectedCityCoords.lng;
    const toLat = selectedCityCoords.lat;
    const controls = animate(0, 1, {
      duration: 0.8,
      ease: "easeInOut",
      onUpdate: (t) => {
        const next: [number, number] = [
          fromLng + (toLng - fromLng) * t,
          fromLat + (toLat - fromLat) * t,
        ];
        centerRef.current = next;
        setCenter(next);
      },
    });
    return () => controls.stop();
  }, [selectedCityCoords]);

  // 나라 검색 → 글로브 카메라 이동
  useEffect(() => {
    if (!globeCountryTarget) return;

    const geo = geographiesRef.current.find(
      (g) => (g.properties.name ?? "") === globeCountryTarget,
    );
    if (!geo) {
      setGlobeCountryTarget(null);
      return;
    }

    const rawName = globeCountryTarget;
    const bounds = COUNTRY_MAIN_BBOX[rawName] ?? getGeoBounds(geo);
    if (!bounds) {
      setGlobeCountryTarget(null);
      return;
    }

    const iso = COUNTRY_NAME_ISO3[rawName];
    if (iso) setClickedIso(iso);
    setClickedName(rawName);
    setClickedGeo(geo);
    setHoveredAdminKey(null);
    setTooltip(null);
    setIsZooming(true);

    const { center: newCenter, zoom: newZoom } = calcCountryView(
      bounds.minLng, bounds.maxLng, bounds.minLat, bounds.maxLat, width, height,
    );
    const currentLng = centerRef.current[0];
    const diff = ((((newCenter[0] - currentLng + 180) % 360) + 360) % 360) - 180;
    const targetCenter: [number, number] = [currentLng + diff, newCenter[1]];

    if (animControlsRef.current) animControlsRef.current.stop();
    const fromCenter: [number, number] = [...centerRef.current];
    const fromZoom = zoomRef.current;

    const controls = animate(0, 1, {
      duration: 0.85,
      ease: "easeInOut",
      onUpdate: (t) => {
        const animCenter: [number, number] = [
          fromCenter[0] + (targetCenter[0] - fromCenter[0]) * t,
          fromCenter[1] + (targetCenter[1] - fromCenter[1]) * t,
        ];
        const animZoom = fromZoom + (newZoom - fromZoom) * t;
        centerRef.current = animCenter;
        zoomRef.current = animZoom;
        setCenter([...animCenter]);
        setZoom(animZoom);
      },
      onComplete: () => {
        centerRef.current = targetCenter;
        zoomRef.current = newZoom;
        setCenter(targetCenter);
        setZoom(newZoom);
        setIsZooming(false);
        setGlobeCountryTarget(null);
      },
    });
    animControlsRef.current = controls;
  }, [globeCountryTarget, width, height]);

  const { data: citiesFromApi } = useCityList();
  const cities = citiesFromApi ?? [];

  const matchedCityIds = useMemo<Set<number>>(() => {
    if (!isRecommendActive || recommendResults.length === 0) return new Set();
    const recommendCityNames = new Set(recommendResults.map((r) => r.city));
    return new Set(
      cities
        .filter((c) => recommendCityNames.has(c.cityName))
        .map((c) => c.cityId),
    );
  }, [cities, recommendResults, isRecommendActive]);

  // 추천 활성 시 도시명 → totalScore 매핑 (마커 색상용)
  const recommendScoreMap = useMemo<Map<string, number>>(() => {
    if (!isRecommendActive || recommendResults.length === 0) return new Map();
    return new Map(recommendResults.map((r) => [r.city, r.totalScore]));
  }, [isRecommendActive, recommendResults]);

  // 추천 활성 시 상위 3개 도시 → cityId: rank(1|2|3) 매핑
  const medalRankMap = useMemo<Map<number, 1 | 2 | 3>>(() => {
    if (!isRecommendActive || recommendResults.length === 0) return new Map();
    const cityNameToId = new Map(cities.map((c) => [c.cityName, c.cityId]));
    const map = new Map<number, 1 | 2 | 3>();
    recommendResults.slice(0, 3).forEach((r) => {
      const id = cityNameToId.get(r.city);
      if (id !== undefined) map.set(id, r.rank as 1 | 2 | 3);
    });
    return map;
  }, [cities, recommendResults, isRecommendActive]);

  // ── 줌 버튼 핸들러 ────────────────────────────────────────
  const handleZoomButton = useCallback((factor: number) => {
    const fromZoom = zoomRef.current;
    const toZoom = Math.min(Math.max(fromZoom * factor, 0.8), 80);
    if (animControlsRef.current) animControlsRef.current.stop();
    const controls = animate(0, 1, {
      duration: 0.4,
      ease: "easeInOut",
      onUpdate: (t) => {
        const z = fromZoom + (toZoom - fromZoom) * t;
        zoomRef.current = z;
        setZoom(z);
      },
      onComplete: () => {
        zoomRef.current = toZoom;
        setZoom(toZoom);
      },
    });
    animControlsRef.current = controls;
  }, []);

  const worldWidth = (2 * Math.PI * width) / 7;
  const OFFSETS = [-1, 0, 1] as const;

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <ComposableMap
        width={width}
        height={height}
        projection="geoMercator"
        projectionConfig={{ scale: width / 7 }}
        tabIndex={-1}
        style={{ width: "100%", height: "100%", outline: "none" }}
      >
        <ZoomableGroup
          center={center}
          zoom={zoom}
          minZoom={0.8}
          maxZoom={80}
          translateExtent={[
            [-1e10, -(height * 0.6)],
            [1e10, height * 1.6],
          ]}
          onMoveEnd={({ coordinates, zoom: z }) => {
            // 경도를 [-180, 180]으로 정규화 (트레드밀 스냅백)
            const rawLng = coordinates[0];
            const normalizedLng = ((((rawLng + 180) % 360) + 360) % 360) - 180;
            const next: [number, number] = [
              normalizedLng,
              Math.max(-85, Math.min(85, coordinates[1])),
            ];
            centerRef.current = next;
            zoomRef.current = z;
            setCenter(next);
            setZoom(Math.round(z * 10) / 10);
          }}
        >
          {OFFSETS.map((offset, slotIndex) => (
            <g
              key={slotIndex}
              transform={`translate(${offset * worldWidth}, 0)`}
            >
              {/* 나라 채우기 + 경계선 레이어 (10m) */}
              <BaseLayer
                geography={geoData ?? GEO_URL}
                clickedName={clickedName}
                showBorders={showBorders}
                onCountryClick={handleCountryClick}
                onEnter={handleEnter}
                onMove={handleMove}
                onLeave={handleLeave}
                zoom={zoom}
                onLoad={(geos) => { geographiesRef.current = geos; }}
              />

              {/* 대륙 외곽선 — 줌 1.5 미만에서만 (나라 선택 여부 무관) */}
              {zoom < ZOOM_SHOW_BORDERS && (
                <Geographies geography={landData ?? LAND_URL}>
                  {({ geographies }: { geographies: GeoFeature[] }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="none"
                        stroke="#b0bfcc"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none", pointerEvents: "none" },
                          hover: { outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>
              )}

              {/* 행정구역 레이어 — 줌 완료 후에만 렌더 (isZooming=false 시) */}
              {(() => {
                if (showAdmin && clickedIso && slotIndex === 1) {
                  // 3D 상면 위치에 맞추기 위해 transform 적용
                  const visualHeight = 8 / Math.pow(zoom, 0.4);
                  const totalH = visualHeight / zoom;
                  const xOffset = totalH * 0.4;
                  const yOffset = -totalH;

                  return (
                    <g transform={`translate(${xOffset}, ${yOffset})`}>
                      <AdminLayer
                        iso={clickedIso}
                        hoveredAdminKey={hoveredAdminKey}
                        onAdminEnter={handleAdminEnter}
                        onAdminMove={handleAdminMove}
                        onAdminLeave={handleAdminLeave}
                        onDeselect={handleDeselect}
                      />
                    </g>
                  );
                }
                return null;
              })()}

              {/* ── 레이어 3 (bottom): 메달 이미지 ── */}
              {cities.map((city) => {
                const medalRank = medalRankMap.get(city.cityId);
                if (!medalRank) return null;
                const r = 5 / Math.pow(zoom, 0.8);
                const medalSize = 30 / Math.pow(zoom, 0.8);
                const isCityInClickedCountry =
                  clickedName &&
                  (COUNTRY_NAME_KO[clickedName] === city.countryName ||
                    (clickedName === "South Korea" && city.countryName === "한국") ||
                    (clickedName === "United Kingdom" && city.countryName === "영국"));
                let markerTransform = "";
                if (isCityInClickedCountry) {
                  const visualHeight = 8 / Math.pow(zoom, 0.4);
                  const totalH = visualHeight / zoom;
                  markerTransform = `translate(${totalH * 0.4}, ${-totalH})`;
                }
                return (
                  <Marker key={`medal-${city.cityId}-${slotIndex}`} coordinates={[city.longitude, city.latitude]}>
                    <g transform={markerTransform} style={{ pointerEvents: "none" }}>
                      <image
                        href={MEDAL_IMGS[medalRank]}
                        x={-medalSize / 2}
                        y={-(r + medalSize)}
                        width={medalSize}
                        height={medalSize}
                      />
                    </g>
                  </Marker>
                );
              })}

              {/* ── 레이어 2 (middle): 비추천 도시 포인트 ── */}
              {cities.map((city) => {
                const isMatched = !isRecommendActive || matchedCityIds.has(city.cityId);
                if (isMatched) return null;
                const r = 5 / Math.pow(zoom, 0.8);
                const isCityInClickedCountry =
                  clickedName &&
                  (COUNTRY_NAME_KO[clickedName] === city.countryName ||
                    (clickedName === "South Korea" && city.countryName === "한국") ||
                    (clickedName === "United Kingdom" && city.countryName === "영국"));
                let markerTransform = "";
                if (isCityInClickedCountry) {
                  const visualHeight = 8 / Math.pow(zoom, 0.4);
                  const totalH = visualHeight / zoom;
                  markerTransform = `translate(${totalH * 0.4}, ${-totalH})`;
                }
                return (
                  <Marker
                    key={`dot-${city.cityId}-${slotIndex}`}
                    coordinates={[city.longitude, city.latitude]}
                    onClick={() => openRightPanel(city.cityId, city.imgUrl, { lat: city.latitude, lng: city.longitude })}
                  >
                    <g transform={markerTransform}>
                      <circle
                        r={Math.max(r * 1.3, 6 / zoom)}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(e) => setTooltip({ name: city.cityName, x: e.clientX, y: e.clientY })}
                        onMouseMove={(e) => handleTooltipMove(city.cityName, e)}
                        onMouseLeave={() => setTooltip(null)}
                      />
                      <circle r={r} fill="#CBD5E1" stroke="#fff" strokeWidth={1 / zoom} style={{ pointerEvents: "none" }} />
                    </g>
                  </Marker>
                );
              })}

              {/* ── 레이어 1 (top): 추천 도시 포인트 ── */}
              {cities.map((city) => {
                const isMatched = !isRecommendActive || matchedCityIds.has(city.cityId);
                if (!isMatched) return null;
                const medalRank = medalRankMap.get(city.cityId);
                const isSelected = city.cityId === selectedCityId;
                const markerScore =
                  isSelected && selectedCityScore !== null
                    ? selectedCityScore
                    : recommendScoreMap.get(city.cityName);
                const r = 5 / Math.pow(zoom, 0.8);
                const isCityInClickedCountry =
                  clickedName &&
                  (COUNTRY_NAME_KO[clickedName] === city.countryName ||
                    (clickedName === "South Korea" && city.countryName === "한국") ||
                    (clickedName === "United Kingdom" && city.countryName === "영국"));
                let markerTransform = "";
                if (isCityInClickedCountry) {
                  const visualHeight = 8 / Math.pow(zoom, 0.4);
                  const totalH = visualHeight / zoom;
                  markerTransform = `translate(${totalH * 0.4}, ${-totalH})`;
                }
                const medalSize = 30 / Math.pow(zoom, 0.8);
                return (
                  <Marker
                    key={`dot-${city.cityId}-${slotIndex}`}
                    coordinates={[city.longitude, city.latitude]}
                    onClick={() => openRightPanel(city.cityId, city.imgUrl, { lat: city.latitude, lng: city.longitude })}
                  >
                    <g transform={markerTransform}>
                      {medalRank ? (
                        <rect
                          x={-medalSize / 2}
                          y={-(r + medalSize)}
                          width={medalSize}
                          height={medalSize + r * 2.5}
                          fill="transparent"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => setTooltip({ name: city.cityName, x: e.clientX, y: e.clientY })}
                          onMouseMove={(e) => handleTooltipMove(city.cityName, e)}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      ) : (
                        <circle
                          r={Math.max(r * 1.3, 6 / zoom)}
                          fill="transparent"
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => setTooltip({ name: city.cityName, x: e.clientX, y: e.clientY })}
                          onMouseMove={(e) => handleTooltipMove(city.cityName, e)}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      )}
                      <circle
                        r={r}
                        fill={getMarkerColor(markerScore)}
                        stroke="#fff"
                        strokeWidth={1 / zoom}
                        style={{ pointerEvents: "none" }}
                      />
                    </g>
                  </Marker>
                );
              })}
            </g>
          ))}
        </ZoomableGroup>
      </ComposableMap>
      {/* 줌 컨트롤 버튼 */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          zIndex: 50,
        }}
      >
        {[
          { label: "+", factor: 2 },
          { label: "−", factor: 0.5 },
        ].map(({ label, factor }) => (
          <button
            key={label}
            onClick={() => handleZoomButton(factor)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              border: "1px solid rgba(0,0,0,0.15)",
              background: "rgba(255,255,255,0.9)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#334155",
              userSelect: "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 28,
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 12,
            pointerEvents: "none",
            zIndex: 50,
            whiteSpace: "nowrap",
          }}
        >
          {tooltip.name}
        </div>
      )}
    </div>
  );
}
