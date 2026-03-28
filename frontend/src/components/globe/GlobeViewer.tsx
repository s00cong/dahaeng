import { useEffect, useRef, useMemo, useState } from "react";
import { toast } from "sonner";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { feature as topoFeature } from "topojson-client";
import { useUiStore } from "@/stores/uiStore";
import { useCityList } from "@/hooks/city/useCityList";
import { useCitySummary } from "@/hooks/flight/useCitySummary";
import { queryClient } from "@/lib/queryClient";
import { cityApi } from "@/api/city.api";
import { queryKeys } from "@/utils/queryKeys";
import { COUNTRY_NAME_KO } from "@/data/countryNameKo";
import { CITY_NAME_KO } from "@/data/cityNameKo";
import { COUNTRY_NAME_ISO3 } from "@/data/countryNameIso3";
import { PARTIAL_EVAC_ZONES, EVAC_COLOR } from "@/data/partialEvacZones";
import { COUNTRY_TO_CONTINENT, CONTINENT_COLORS, DEFAULT_CONTINENT_COLOR } from "@/data/continentData";
import medal1Img from "@/assets/medal1.png";
import medal2Img from "@/assets/medal2.png";
import medal3Img from "@/assets/medal3.png";

const MEDAL_IMGS: Record<1 | 2 | 3, string> = {
  1: medal1Img,
  2: medal2Img,
  3: medal3Img,
};

interface GlobeViewerProps {
  width: number;
  height: number;
}

// ── 색상 유틸 ──────────────────────────────────────────────────────────────────
function getMarkerColor(score: number | null | undefined, fallback: string): string {
  if (score == null) return fallback;
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#3b82f6";
  return "#f59e0b";
}

// ── 단계구분도(Choropleth) 색상 ────────────────────────────────────────────────
const COST_CHOROPLETH = [
  { max: 30000, color: "#fffbeb", label: "3만 미만" },
  { max: 60000, color: "#fef3c7", label: "3~6만" },
  { max: 100000, color: "#fde68a", label: "6~10만" },
  { max: 150000, color: "#f59e0b", label: "10~15만" },
  { max: 200000, color: "#d97706", label: "15~20만" },
  { max: Infinity, color: "#92400e", label: "20만 초과" },
] as const;

const DANGER_CHOROPLETH = [
  { max: 0, color: "#10b981", label: "안전" },
  { max: 2, color: "#fbbf24", label: "여행유의" },
  { max: 3, color: "#f97316", label: "여행주의" },
  { max: 4, color: "#ef4444", label: "여행자제" },
  { max: 5, color: "#ef4444", label: "철수권고" },
  { max: Infinity, color: "#dc2626", label: "여행금지" },
] as const;

function getChoroplethColor(value: number, mode: "cost" | "danger"): string {
  const steps = mode === "cost" ? COST_CHOROPLETH : DANGER_CHOROPLETH;
  for (const step of steps) {
    if (value <= step.max) return step.color;
  }
  return steps[steps.length - 1].color;
}

// city.countryName → GeoJSON name 별칭 (불일치 보정)
const COUNTRY_ALIAS: Record<string, string> = {
  "united states": "United States of America",
  usa: "United States of America",
  "u.s.a.": "United States of America",
  "czech republic": "Czechia",
  uae: "United Arab Emirates",
};

// ── GeoJSON 좌표 전체 추출 (나라 bbox 계산용) ────────────────────────────────
function getAllCoords(geom: GeoJSON.Geometry): number[][] {
  if (geom.type === "Polygon") return (geom.coordinates as number[][][]).flat();
  if (geom.type === "MultiPolygon")
    return (geom.coordinates as number[][][][]).flat(2);
  return [];
}

// ── 안티메리디안 폴리곤 좌표 정규화 ─────────────────────────────────────────
function fixRing(ring: number[][]): number[][] {
  if (ring.length === 0) return ring;
  const result: number[][] = [ring[0].slice()];
  for (let i = 1; i < ring.length; i++) {
    const prev = result[i - 1][0];
    let lng = ring[i][0];
    while (lng - prev > 180) lng -= 360;
    while (lng - prev < -180) lng += 360;
    result.push([lng, ring[i][1]]);
  }
  return result;
}

function fixGeometry(geom: GeoJSON.Geometry): GeoJSON.Geometry {
  if (geom.type === "Polygon") {
    return { ...geom, coordinates: geom.coordinates.map(fixRing) };
  }
  if (geom.type === "MultiPolygon") {
    return {
      ...geom,
      coordinates: (geom.coordinates as number[][][][]).map((poly) =>
        poly.map(fixRing),
      ),
    };
  }
  return geom;
}

function fixAntimeridian(
  fc: GeoJSON.FeatureCollection,
): GeoJSON.FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f) =>
      f.geometry ? { ...f, geometry: fixGeometry(f.geometry) } : f,
    ),
  };
}

// ── 줌 레벨 UI ────────────────────────────────────────────────────────────────
const ZOOM_STEPS = [
  { zoom: 1, label: "세계" },
  { zoom: 2, label: "대륙" },
  { zoom: 3, label: "국가" },
  { zoom: 4, label: "지역" },
  { zoom: 5, label: "도시" },
] as const;

function getZoomLabel(z: number): string {
  if (z < 1.5) return "세계";
  if (z < 2.5) return "대륙";
  if (z < 3.5) return "국가";
  if (z < 4.5) return "지역";
  return "도시";
}

function ZoomControl({
  zoom,
  onZoom,
  left,
}: {
  zoom: number;
  onZoom: (z: number) => void;
  left: number;
}) {
  const MIN = 1;
  const MAX = 5;
  const pct = ((zoom - MIN) / (MAX - MIN)) * 100;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: left - 16,
        zIndex: 50,
        transition: "left 0.3s ease",
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(8px)",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 180,
      }}
    >
      {/* 상단: 현재 단계 라벨 + 줌 수치 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e40af" }}>
          {getZoomLabel(zoom)}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#94a3b8",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {zoom.toFixed(1)}
        </span>
      </div>

      {/* 슬라이더 */}
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={0.1}
        value={zoom}
        onChange={(e) => onZoom(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#3b82f6", cursor: "pointer" }}
      />

      {/* 하단: 단계 라벨들 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {ZOOM_STEPS.map(({ zoom: sz, label }) => {
          const stepPct = ((sz - MIN) / (MAX - MIN)) * 100;
          const isActive = Math.abs(pct - stepPct) < 8;
          return (
            <button
              key={label}
              onClick={() => onZoom(sz)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                fontSize: 10,
                fontWeight: isActive ? 700 : 400,
                color: isActive ? "#1e40af" : "#94a3b8",
                transition: "color 0.2s, font-weight 0.2s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const COUNTRY_FLY_TO: Record<
  string,
  { center: [number, number]; zoom: number }
> = {
  Russia: { center: [90, 62], zoom: 2 },
  "United States of America": { center: [-98, 39], zoom: 3 },
  Canada: { center: [-96, 60], zoom: 3 },
  France: { center: [2, 46], zoom: 4 },
  "United Kingdom": { center: [-2, 54], zoom: 4 },
  Norway: { center: [15, 65], zoom: 3 },
  Indonesia: { center: [118, -2], zoom: 3 },
  Antarctica: { center: [0, -90], zoom: 2 },
  "New Zealand": { center: [172, -41], zoom: 4 },
  Fiji: { center: [178, -18], zoom: 5 },
  Samoa: { center: [-172, -14], zoom: 6 },
  Kiribati: { center: [-157, 2], zoom: 5 },
  Tonga: { center: [-175, -20], zoom: 6 },
};

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#0d1b2e" },
    },
  ],
};

// ── 비행 경로 헬퍼 ────────────────────────────────────────────────────────────
const SEOUL: [number, number] = [126.978, 37.5665]; // [lng, lat]
const FLIGHT_DURATION_MS = 5000;

/** 두 점 사이 대권 호 n개 점 (slerp) */
function greatCircleArc(
  from: [number, number],
  to: [number, number],
  n = 80,
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const [lng1, lat1] = [toRad(from[0]), toRad(from[1])];
  const [lng2, lat2] = [toRad(to[0]), toRad(to[1])];

  const x1 = Math.cos(lat1) * Math.cos(lng1);
  const y1 = Math.cos(lat1) * Math.sin(lng1);
  const z1 = Math.sin(lat1);

  const x2 = Math.cos(lat2) * Math.cos(lng2);
  const y2 = Math.cos(lat2) * Math.sin(lng2);
  const z2 = Math.sin(lat2);

  const dot = Math.min(1, Math.max(-1, x1 * x2 + y1 * y2 + z1 * z2));
  const omega = Math.acos(dot);

  if (omega < 1e-6) return [from, to];

  const points: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const sinO = Math.sin(omega);
    const a = Math.sin((1 - t) * omega) / sinO;
    const b = Math.sin(t * omega) / sinO;
    const x = a * x1 + b * x2;
    const y = a * y1 + b * y2;
    const z = a * z1 + b * z2;
    const lat = toDeg(Math.asin(Math.max(-1, Math.min(1, z))));
    const lng = toDeg(Math.atan2(y, x));
    points.push([lng, lat]);
  }
  return points;
}

/** "2시간 30분" → "2h 30m", "2시간" → "2h", "30분" → "30m" */
function parseDurationText(text: string): string {
  const h = text.match(/(\d+)\s*시간/)?.[1];
  const m = text.match(/(\d+)\s*분/)?.[1];
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  if (m) return `${m}m`;
  return text;
}

/**
 * 안티메리디안(±180°) 경계를 넘는 경로의 경도를 연속값으로 정규화
 * 예) 179°E → -179°E 부호 반전 대신 179°E → 181°E 로 연장
 * MapLibre는 180° 초과 경도를 world-wrap 좌표로 정상 처리함
 */
function normalizeLongitudes(points: [number, number][]): [number, number][] {
  if (points.length <= 1) return points;
  const result: [number, number][] = [[points[0][0], points[0][1]]];
  for (let i = 1; i < points.length; i++) {
    let lng = points[i][0];
    const prev = result[i - 1][0];
    while (lng - prev > 180) lng -= 360;
    while (lng - prev < -180) lng += 360;
    result.push([lng, points[i][1]]);
  }
  return result;
}

/**
 * 대권 호의 최고 위도를 peakLat(°)으로 부드럽게 압축
 * 단거리(이미 peakLat 미만)는 그대로 반환
 */
function limitArcPeakLatitude(
  points: [number, number][],
  peakLat = 60,
): [number, number][] {
  const actualPeak = Math.max(...points.map((p) => p[1]));
  if (actualPeak <= peakLat) return points;
  const ratio = peakLat / actualPeak; // 목표 압축 비율
  const last = points.length - 1;
  return points.map(([lng, lat], i) => {
    // sin(t·π): 양 끝 0 → 중앙 1 → 양 끝 0 으로 가중치 부드럽게 전환
    const t = i / last;
    const blend = Math.sin(t * Math.PI);
    // blend=0(양끝)이면 원래 위도, blend=1(중앙)이면 ratio 적용
    const newLat = lat > 0 ? lat * (1 - blend * (1 - ratio)) : lat;
    return [lng, newLat];
  });
}

/**
 * 안티메리디안(±180°) 경계에서 LineString을 분리 → MultiLineString 세그먼트 반환
 * GeoJSON LineString이 경계를 넘으면 지도 반대편으로 직선을 그리는 문제를 방지
 */
function splitAtAntimeridian(points: [number, number][]): [number, number][][] {
  const segments: [number, number][][] = [];
  if (points.length === 0) return segments;

  let seg: [number, number][] = [[points[0][0], points[0][1]]];

  for (let i = 1; i < points.length; i++) {
    const p0 = seg[seg.length - 1];
    const p1 = points[i];
    const dLng = p1[0] - p0[0];

    if (Math.abs(dLng) > 180) {
      // 안티메리디안 통과: +180 → -180 (동쪽) 또는 -180 → +180 (서쪽)
      const goingEast = dLng < -180;
      const t = goingEast
        ? (180 - p0[0]) / (p1[0] + 360 - p0[0])
        : (-180 - p0[0]) / (p1[0] - 360 - p0[0]);
      const crossLat = p0[1] + t * (p1[1] - p0[1]);

      // 현재 세그먼트를 ±180에서 끊고 새 세그먼트 시작
      seg.push([goingEast ? 180 : -180, crossLat]);
      segments.push(seg);
      seg = [
        [goingEast ? -180 : 180, crossLat],
        [p1[0], p1[1]],
      ];
    } else {
      seg.push([p1[0], p1[1]]);
    }
  }

  segments.push(seg);
  return segments;
}

/**
 * 메르카토르 투영 기준으로 등거리 리샘플링
 * - 지리 등분(slerp)은 고위도에서 화면상 더 크게 보여 빠르게 보임
 * - 메르카토르 누적 거리를 기준으로 재배치하면 화면상 일정한 속도로 이동
 */
function resampleByMercatorDistance(
  points: [number, number][],
  count: number,
): [number, number][] {
  if (points.length < 2) return points;

  // 메르카토르 y 좌표 (위도 → northing)
  const mercY = (lat: number) =>
    Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

  // 누적 메르카토르 거리 계산
  const cumDist: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = (points[i][0] - points[i - 1][0]) * (Math.PI / 180);
    const dy = mercY(points[i][1]) - mercY(points[i - 1][1]);
    cumDist.push(cumDist[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const total = cumDist[cumDist.length - 1];

  // 등거리 간격으로 리샘플
  const result: [number, number][] = [];
  let j = 0;
  for (let i = 0; i < count; i++) {
    const target = (i / (count - 1)) * total;
    while (j < cumDist.length - 2 && cumDist[j + 1] < target) j++;
    const seg = cumDist[j + 1] - cumDist[j];
    const t = seg > 0 ? (target - cumDist[j]) / seg : 0;
    result.push([
      points[j][0] + t * (points[j + 1][0] - points[j][0]),
      points[j][1] + t * (points[j + 1][1] - points[j][1]),
    ]);
  }
  return result;
}

/** 두 점 사이 방위각(deg) */
function getBearing(from: [number, number], to: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(to[0] - from[0]);
  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function GlobeViewer({ width, height }: GlobeViewerProps) {
  const {
    openRightPanel,
    selectedCityCoords,
    selectedCityId,
    isRecommendActive,
    recommendResults,
    globeCountryTarget,
    setGlobeCountryTarget,
    isRightPanelOpen,
    isRightPanelCollapsed,
    isLeftSidebarCollapsed,
    planeTrackingDest,
    setPlaneTrackingDest,
    setSelectedCityCoords,
  } = useUiStore();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const hoveredIdRef = useRef<number | null>(null);
  const selectedIdRef = useRef<number | null>(null);

  const [clickedName, setClickedName] = useState<string | null>(null);
  const [, setClickedIso] = useState<string | null>(null);
  const clickedNameRef = useRef<string | null>(null);
  clickedNameRef.current = clickedName;
  const currentAdminIsoRef = useRef<string | null>(null);

  const [tooltip, setTooltip] = useState<{
    name: string;
    sub?: string;
    x: number;
    y: number;
  } | null>(null);
  const [visualMode, setVisualMode] = useState<"none" | "cost" | "danger">(
    "none",
  );
  const [currentZoom, setCurrentZoom] = useState(1.5);
  const [isSatellite, setIsSatellite] = useState(false);
  const medalMarkersRef = useRef<maplibregl.Marker[]>([]);
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);
  const flightAnimRef = useRef<number | null>(null);
  const flightStartTimeRef = useRef<number | null>(null);
  const flightOverlayRef = useRef<HTMLDivElement | null>(null);
  const countriesDataRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const countryGeoIdMapRef = useRef<Map<string, number>>(new Map());
  // 맵 핀포인트 직접 클릭 시 flyTo 스킵 플래그
  const skipCityFlyRef = useRef(false);

  const { data: citiesFromApi, isError: isCityListError } = useCityList();
  const cities = citiesFromApi ?? [];

  useEffect(() => {
    if (isCityListError) {
      toast.error("도시 정보를 불러오지 못했습니다. 새로고침 해주세요.");
    }
  }, [isCityListError]);

  const currentYearMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const { data: citySummary } = useCitySummary(
    selectedCityId ?? null,
    currentYearMonth,
  );
  const minDurationText = citySummary?.min_duration_text ?? null;

  const matchedCityIds = useMemo<Set<number>>(() => {
    if (!isRecommendActive || recommendResults.length === 0) return new Set();
    const names = new Set(recommendResults.map((r) => r.city));
    return new Set(
      cities.filter((c) => names.has(c.cityName)).map((c) => c.cityId),
    );
  }, [cities, recommendResults, isRecommendActive]);

  const recommendScoreMap = useMemo<Map<string, number>>(() => {
    if (!isRecommendActive || recommendResults.length === 0) return new Map();
    return new Map(recommendResults.map((r) => [r.city, r.totalScore]));
  }, [isRecommendActive, recommendResults]);

  const medalRankMap = useMemo<Map<number, 1 | 2 | 3>>(() => {
    if (!isRecommendActive || recommendResults.length === 0) return new Map();
    const nameToId = new Map(cities.map((c) => [c.cityName, c.cityId]));
    const map = new Map<number, 1 | 2 | 3>();
    recommendResults.slice(0, 3).forEach((r) => {
      const id = nameToId.get(r.city);
      if (id !== undefined) map.set(id, r.rank as 1 | 2 | 3);
    });
    return map;
  }, [cities, recommendResults, isRecommendActive]);

  // ── 1. 지도 초기화 ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [10, 20],
      zoom: 1.5,
      minZoom: 1,
      maxZoom: 5,
      renderWorldCopies: true,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("zoom", () => setCurrentZoom(map.getZoom()));

    map.on("load", async () => {
      map.resize();

      const topo = (await fetch("/geo/countries-50m.json").then((r) =>
        r.json(),
      )) as any;

      // StrictMode에서 cleanup된 이전 map 인스턴스의 콜백이 실행되는 것을 방지
      if (mapRef.current !== map) return;

      const rawCountries = topoFeature(
        topo,
        topo.objects.countries,
      ) as unknown as GeoJSON.FeatureCollection;

      // 남극 제거
      rawCountries.features = rawCountries.features.filter(
        (f) => f.properties?.name !== "Antarctica",
      );

      const countries = fixAntimeridian(rawCountries);
      countriesDataRef.current = countries;

      // GeoJSON name(소문자) → generateId 인덱스(=feature-state id) 맵 빌드
      countries.features.forEach((f, i) => {
        if (f.properties?.name) {
          countryGeoIdMapRef.current.set(
            (f.properties.name as string).toLowerCase(),
            i,
          );
        }
      });

      map.addSource("countries", {
        type: "geojson",
        data: countries,
        generateId: true,
      });
      map.addLayer({
        id: "country-fill",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#bfdbfe",
            ["boolean", ["feature-state", "hover"], false],
            "#e2e8ef",
            [
              "case",
              ["!=", ["get", "choroplethColor"], null],
              ["get", "choroplethColor"],
              "#F1F5F9",
            ],
          ],
          "fill-opacity": [
            "case",
            ["!=", ["get", "choroplethColor"], null],
            0.72,
            1,
          ],
        },
      });

      map.addLayer({
        id: "country-border",
        type: "line",
        source: "countries",
        paint: {
          "line-color": "#cfcfcf",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            1,
            0.3,
            5,
            0.8,
            10,
            1.2,
          ],
        },
      });

      map.addSource("cities", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "city-heatmap",
        type: "heatmap",
        source: "cities",
        paint: {
          "heatmap-weight": ["get", "heatWeight"],
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            1,
            9,
            3,
          ],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,0,0,0)",
            0.2,
            "#10b981",
            0.4,
            "#fbbf24",
            0.6,
            "#f97316",
            0.8,
            "#ef4444",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
          "heatmap-opacity": 0.6,
        },
        layout: { visibility: "none" },
      });

      map.addLayer({
        id: "city-circles",
        type: "circle",
        source: "cities",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 6, 5, 9],
          "circle-color": [
            "coalesce",
            ["to-color", ["get", "color"]],
            "#3b82f6",
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#e0e0e0",
          "circle-opacity": 0.9,
        },
      });

      // 투명 히트박스 레이어 (클릭 및 호버 영역 확장용)
      map.addLayer({
        id: "city-hitbox",
        type: "circle",
        source: "cities",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 12, 10, 18],
          "circle-color": "transparent",
        },
      });

      // 도시 클릭 이벤트 (히트박스 기준)
      map.on("click", "city-hitbox", async (e) => {
        if (!e.features || e.features.length === 0) return;
        e.preventDefault();

        const props = e.features[0].properties;
        const cityId = props?.cityId as number;
        const imgUrl = props?.imgUrl as string;
        const lat = props?.lat as number;
        const lng = props?.lng as number;

        // 클릭 시점의 최신 추천 상태를 읽어 prefetch 방향 결정
        const {
          isRecommendActive: recActive,
          recommendResults: recResults,
          recommendRequest: recReq,
        } = useUiStore.getState();
        const cityName = queryClient
          .getQueryData<{ cityName: string }[]>([...queryKeys.city.list()])
          ?.find((c: any) => c.cityId === cityId)?.cityName;
        const isRec =
          recActive &&
          !!cityName &&
          recResults.some((r) => r.city === cityName);

        if (isRec && recReq) {
          queryClient.prefetchQuery({
            queryKey: [...queryKeys.city.detail(cityId), true, recReq],
            queryFn: () => cityApi.getDetail(cityId, true, recReq),
            staleTime: 5 * 60 * 1000,
          });
        } else {
          queryClient.prefetchQuery({
            queryKey: [...queryKeys.city.detail(cityId), false, null],
            queryFn: () => cityApi.getDetail(cityId, false),
            staleTime: 5 * 60 * 1000,
          });
        }

        skipCityFlyRef.current = true;
        openRightPanel(cityId, imgUrl, { lat, lng });

        // 핀포인트가 속한 나라 감지 → 나라 선택 + 행정구역 폴리곤 표시
        const countryFeatures = map.queryRenderedFeatures(e.point, {
          layers: ["country-fill"],
        });
        if (!countryFeatures.length) return;

        const cf = countryFeatures[0];
        const countryId = cf.id as number;
        const countryName = (cf.properties as any).name as string;
        const iso = COUNTRY_NAME_ISO3[countryName] ?? null;

        // 이미 같은 나라가 선택되어 있으면 행정구역 재로드 불필요
        if (clickedNameRef.current === countryName) return;

        // 이전 선택 해제
        if (selectedIdRef.current !== null) {
          map.setFeatureState(
            { source: "countries", id: selectedIdRef.current },
            { selected: false },
          );
        }
        selectedIdRef.current = countryId;
        map.setFeatureState(
          { source: "countries", id: countryId },
          { selected: true },
        );
        setClickedName(countryName);
        setClickedIso(iso);

        // 행정구역 레이어 로드
        if (iso) {
          try {
            if (map.getLayer("admin-fill")) map.removeLayer("admin-fill");
            if (map.getLayer("admin-border")) map.removeLayer("admin-border");
            if (map.getSource("admin")) map.removeSource("admin");

            const topo = await fetch(
              `/geo_10m/countries/${iso}.topo.json`,
            ).then((r) => r.json());
            const objKey = Object.keys(topo.objects)[0];
            const adminGeo = topoFeature(topo, topo.objects[objKey]) as any;

            map.addSource("admin", {
              type: "geojson",
              data: adminGeo,
              generateId: true,
            });
            map.addLayer(
              {
                id: "admin-fill",
                type: "fill",
                source: "admin",
                paint: {
                  "fill-color": [
                    "case",
                    ["boolean", ["feature-state", "hover"], false],
                    "rgba(99,179,237,0.3)",
                    "rgba(0,0,0,0.001)",
                  ],
                },
              },
              "city-circles",
            );
            map.addLayer(
              {
                id: "admin-border",
                type: "line",
                source: "admin",
                paint: { "line-color": "#b0bfcc", "line-width": 0.5 },
              },
              "city-circles",
            );

            currentAdminIsoRef.current = iso;
          } catch (err) {
            console.error("Failed to load admin regions:", err);
          }
        }
      });

      // 도시 호버 이벤트 (히트박스 기준 - 나라 호버보다 우선순위 높음)
      map.on("mousemove", "city-hitbox", (e) => {
        if (!e.features?.length) return;
        // 나라 hover 상태 제거 (도시가 우선)
        if (hoveredIdRef.current !== null) {
          map.setFeatureState(
            { source: "countries", id: hoveredIdRef.current },
            { hover: false },
          );
          hoveredIdRef.current = null;
        }
        map.getCanvas().style.cursor = "pointer";
        const enName = e.features[0].properties?.cityName as string;
        const koName = CITY_NAME_KO[enName];
        setTooltip({
          name: koName ?? enName,
          sub: koName ? enName : undefined,
          x: e.originalEvent.clientX,
          y: e.originalEvent.clientY,
        });
      });

      map.on("mouseleave", "city-hitbox", () => {
        map.getCanvas().style.cursor = "";
        setTooltip(null);
      });

      map.on("mousemove", "country-fill", (e) => {
        if (!e.features || e.features.length === 0) return;
        // 도시 핀포인트 위에 있으면 나라 hover 스킵
        const cityFeatures = map.queryRenderedFeatures(e.point, {
          layers: ["city-hitbox"],
        });
        if (cityFeatures.length > 0) {
          if (hoveredIdRef.current !== null) {
            map.setFeatureState(
              { source: "countries", id: hoveredIdRef.current },
              { hover: false },
            );
            hoveredIdRef.current = null;
          }
          return;
        }
        const f = e.features[0];
        const id = f.id as number;
        const name = (f.properties?.name ?? "") as string;
        if (hoveredIdRef.current !== null && hoveredIdRef.current !== id) {
          map.setFeatureState(
            { source: "countries", id: hoveredIdRef.current },
            { hover: false },
          );
        }
        hoveredIdRef.current = id;
        map.setFeatureState({ source: "countries", id }, { hover: true });
        map.getCanvas().style.cursor = "pointer";
        const koName = COUNTRY_NAME_KO[name] ?? name;
        setTooltip({
          name: koName,
          x: e.originalEvent.clientX,
          y: e.originalEvent.clientY,
        });
      });

      map.on("mouseleave", "country-fill", () => {
        if (hoveredIdRef.current !== null) {
          map.setFeatureState(
            { source: "countries", id: hoveredIdRef.current },
            { hover: false },
          );
          hoveredIdRef.current = null;
        }
        map.getCanvas().style.cursor = "";
        setTooltip(null);
      });

      // 행정구역 호버 이벤트 (한 번만 등록)
      let adminHoveredId: number | null = null;
      map.on("mousemove", "admin-fill", (ev) => {
        if (!ev.features?.length) return;
        // 도시 핀포인트 위에 있으면 행정구역 hover 스킵
        const cityFeatures = map.queryRenderedFeatures(ev.point, {
          layers: ["city-hitbox"],
        });
        if (cityFeatures.length > 0) return;
        const aid = ev.features[0].id as number;
        if (adminHoveredId !== null && adminHoveredId !== aid) {
          map.setFeatureState(
            { source: "admin", id: adminHoveredId },
            { hover: false },
          );
        }
        adminHoveredId = aid;
        map.setFeatureState({ source: "admin", id: aid }, { hover: true });
        const adminName =
          ev.features[0].properties?.shapeName ??
          ev.features[0].properties?.name ??
          "";
        setTooltip({
          name: adminName,
          x: ev.originalEvent.clientX,
          y: ev.originalEvent.clientY,
        });
      });

      map.on("mouseleave", "admin-fill", () => {
        if (adminHoveredId !== null) {
          map.setFeatureState(
            { source: "admin", id: adminHoveredId },
            { hover: false },
          );
          adminHoveredId = null;
        }
        setTooltip(null);
      });

      map.on("click", "country-fill", async (e) => {
        if (!e.features || e.features.length === 0) return;
        // 도시 핀포인트나 행정구역 위에서 클릭하면 나라 클릭 로직 스킵
        const cityFeatures = map.queryRenderedFeatures(e.point, {
          layers: ["city-hitbox"],
        });
        if (cityFeatures.length > 0) return;
        const adminFeatures = map.queryRenderedFeatures(e.point, {
          layers: ["admin-fill"],
        });
        if (adminFeatures.length > 0) return;

        const f = e.features[0];
        const id = f.id as number;
        const name = (f.properties as any).name;

        // 선택 취소 처리 (같은 나라 클릭 시)
        if (name === clickedNameRef.current) {
          if (selectedIdRef.current !== null) {
            map.setFeatureState(
              { source: "countries", id: selectedIdRef.current },
              { selected: false },
            );
            selectedIdRef.current = null;
          }
          setClickedName(null);
          setClickedIso(null);
          if (map.getLayer("admin-fill")) map.removeLayer("admin-fill");
          if (map.getLayer("admin-border")) map.removeLayer("admin-border");
          if (map.getSource("admin")) map.removeSource("admin");
          currentAdminIsoRef.current = null;
          return;
        }

        if (selectedIdRef.current !== null) {
          map.setFeatureState(
            { source: "countries", id: selectedIdRef.current },
            { selected: false },
          );
        }
        selectedIdRef.current = id;
        map.setFeatureState({ source: "countries", id }, { selected: true });

        setClickedName(name);
        const iso = COUNTRY_NAME_ISO3[name] ?? null;
        setClickedIso(iso);

        // 행정구역 레이어 로드
        if (iso) {
          try {
            if (currentAdminIsoRef.current === iso) return;
            const topo = await fetch(
              `/geo_10m/countries/${iso}.topo.json`,
            ).then((r) => r.json());
            const objKey = Object.keys(topo.objects)[0];
            const adminGeo = topoFeature(topo, topo.objects[objKey]) as any;

            if (map.getLayer("admin-fill")) map.removeLayer("admin-fill");
            if (map.getLayer("admin-border")) map.removeLayer("admin-border");
            if (map.getSource("admin")) map.removeSource("admin");

            map.addSource("admin", {
              type: "geojson",
              data: adminGeo,
              generateId: true,
            });
            map.addLayer(
              {
                id: "admin-fill",
                type: "fill",
                source: "admin",
                paint: {
                  "fill-color": [
                    "case",
                    ["boolean", ["feature-state", "hover"], false],
                    "rgba(99,179,237,0.3)",
                    "rgba(0,0,0,0.001)",
                  ],
                },
              },
              "city-circles",
            );

            map.addLayer(
              {
                id: "admin-border",
                type: "line",
                source: "admin",
                paint: { "line-color": "#b0bfcc", "line-width": 0.5 },
              },
              "city-circles",
            );

            currentAdminIsoRef.current = iso;
          } catch (err) {
            console.error("Failed to load admin regions:", err);
          }
        }

        const flyTo = COUNTRY_FLY_TO[name];
        if (flyTo)
          map.flyTo({ center: flyTo.center, zoom: flyTo.zoom, duration: 800 });
        else map.easeTo({ center: e.lngLat, zoom: 4, duration: 800 });
      });

      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ── 2. 데이터 업데이트 및 리사이즈 ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const source = map.getSource("cities") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source) return;

    if (cities.length === 0) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    const features: GeoJSON.Feature[] = cities
      // 좌표가 없는 도시(null → 0,0)는 지도에 표시하지 않음
      .filter((city) => city.latitude !== 0 || city.longitude !== 0)
      .map((city) => {
        const isMatched = !isRecommendActive || matchedCityIds.has(city.cityId);
        const score = recommendScoreMap.get(city.cityName);

        // 히트맵 가중치 계산
        const heatWeight =
          visualMode === "cost"
            ? Math.min(city.estimatedBudget / 7 / 200000, 1)
            : visualMode === "danger"
              ? city.riskLevel / 4
              : 0.5;

        const continentColor =
          CONTINENT_COLORS[COUNTRY_TO_CONTINENT[city.countryName]] ?? DEFAULT_CONTINENT_COLOR;
        const color = !isMatched ? "#CBD5E1" : getMarkerColor(score, continentColor);
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [city.longitude, city.latitude],
          },
          properties: {
            cityId: city.cityId,
            cityName: city.cityName,
            imgUrl: city.imgUrl,
            lat: city.latitude,
            lng: city.longitude,
            color,
            heatWeight,
          },
        };
      });

    source.setData({ type: "FeatureCollection", features });
  }, [
    cities,
    mapReady,
    isRecommendActive,
    matchedCityIds,
    recommendScoreMap,
    visualMode,
  ]);

  useEffect(() => {
    if (mapRef.current) mapRef.current.resize();
  }, [width, height]);

  // ── 3. Choropleth 단계구분도 ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !countriesDataRef.current) return;

    const source = map.getSource("countries") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source) return;

    if (visualMode === "none" || cities.length === 0) {
      // choroplethColor 제거 → 기본색으로 복원
      const resetFeatures = countriesDataRef.current.features.map((f) => ({
        ...f,
        properties: { ...(f.properties ?? {}), choroplethColor: null },
      }));
      source.setData({ ...countriesDataRef.current, features: resetFeatures });
      return;
    }

    // 나라별 통계 집계 (key: 소문자 GeoJSON name)
    const statsMap = new Map<
      string,
      { total: number; count: number; maxDanger: number }
    >();
    cities.forEach((city) => {
      const lower = city.countryName.toLowerCase();
      const canonical = (
        COUNTRY_ALIAS[lower] ?? city.countryName
      ).toLowerCase();
      const key = statsMap.has(canonical)
        ? canonical
        : statsMap.has(lower)
          ? lower
          : canonical;
      const s = statsMap.get(key) ?? { total: 0, count: 0, maxDanger: 0 };
      statsMap.set(key, {
        total: s.total + city.estimatedBudget / 7,
        count: s.count + 1,
        maxDanger: Math.max(s.maxDanger, city.riskLevel),
      });
    });

    // 각 feature에 choroplethColor 프로퍼티 주입 후 setData
    const updatedFeatures = countriesDataRef.current.features.map((f) => {
      const geoName = ((f.properties?.name as string) ?? "").toLowerCase();
      const aliasName = (COUNTRY_ALIAS[geoName] ?? "").toLowerCase();
      const stats = statsMap.get(geoName) ?? statsMap.get(aliasName);
      if (!stats)
        return {
          ...f,
          properties: { ...(f.properties ?? {}), choroplethColor: null },
        };
      const value =
        visualMode === "cost" ? stats.total / stats.count : stats.maxDanger;
      return {
        ...f,
        properties: {
          ...(f.properties ?? {}),
          choroplethColor: getChoroplethColor(value, visualMode),
        },
      };
    });

    source.setData({ ...countriesDataRef.current, features: updatedFeatures });
  }, [visualMode, cities, mapReady]);

  // ── 3-1. 철수권고(일부) 지역 오버레이 ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const SRC = "evac-zones";
    const LYR = "evac-zones-fill";

    if (visualMode !== "danger") {
      if (map.getLayer(LYR)) map.removeLayer(LYR);
      if (map.getSource(SRC)) map.removeSource(SRC);
      return;
    }

    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: PARTIAL_EVAC_ZONES.map((zone, i) => ({
        type: "Feature",
        id: i,
        properties: { color: EVAC_COLOR },
        geometry: zone.geometry,
      })),
    };

    const existing = map.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    if (existing) {
      existing.setData(fc);
    } else {
      map.addSource(SRC, { type: "geojson", data: fc });
      map.addLayer(
        {
          id: LYR,
          type: "fill",
          source: SRC,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": 0.72,
          },
        },
        map.getLayer("country-border") ? "country-border" : undefined,
      );
    }
  }, [visualMode, mapReady]);

  // ── 4. 나라 검색 → 글로브 카메라 이동 ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !globeCountryTarget || !countriesDataRef.current)
      return;

    const feature = countriesDataRef.current.features.find(
      (f) => f.properties?.name === globeCountryTarget,
    );

    // 같은 나라 재선택 시 취소
    if (globeCountryTarget === clickedNameRef.current) {
      if (selectedIdRef.current !== null) {
        map.setFeatureState(
          { source: "countries", id: selectedIdRef.current },
          { selected: false },
        );
        selectedIdRef.current = null;
      }
      setClickedName(null);
      setClickedIso(null);
      if (map.getLayer("admin-fill")) map.removeLayer("admin-fill");
      if (map.getLayer("admin-border")) map.removeLayer("admin-border");
      if (map.getSource("admin")) map.removeSource("admin");
      currentAdminIsoRef.current = null;
      setGlobeCountryTarget(null);
      return;
    }

    if (feature?.geometry) {
      const coords = getAllCoords(feature.geometry);
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const flyTo = COUNTRY_FLY_TO[globeCountryTarget];
      if (flyTo)
        map.flyTo({ center: flyTo.center, zoom: flyTo.zoom, duration: 1600 });
      else
        map.flyTo({ center: [centerLng, centerLat], zoom: 4, duration: 1600 });

      // 이전 선택 해제 + 새 나라 선택
      if (selectedIdRef.current !== null) {
        map.setFeatureState(
          { source: "countries", id: selectedIdRef.current },
          { selected: false },
        );
      }
      const featureId = countryGeoIdMapRef.current.get(
        globeCountryTarget.toLowerCase(),
      );
      if (featureId !== undefined) {
        selectedIdRef.current = featureId;
        map.setFeatureState(
          { source: "countries", id: featureId },
          { selected: true },
        );
      }
      setClickedName(globeCountryTarget);
      const iso = COUNTRY_NAME_ISO3[globeCountryTarget] ?? null;
      setClickedIso(iso);

      // 행정구역 레이어 로드
      if (iso) {
        if (map.getLayer("admin-fill")) map.removeLayer("admin-fill");
        if (map.getLayer("admin-border")) map.removeLayer("admin-border");
        if (map.getSource("admin")) map.removeSource("admin");

        (async () => {
          try {
            const topo = await fetch(
              `/geo_10m/countries/${iso}.topo.json`,
            ).then((r) => r.json());
            const objKey = Object.keys(topo.objects)[0];
            const adminGeo = topoFeature(topo, topo.objects[objKey]) as any;

            map.addSource("admin", {
              type: "geojson",
              data: adminGeo,
              generateId: true,
            });
            map.addLayer(
              {
                id: "admin-fill",
                type: "fill",
                source: "admin",
                paint: {
                  "fill-color": [
                    "case",
                    ["boolean", ["feature-state", "hover"], false],
                    "rgba(99,179,237,0.3)",
                    "rgba(0,0,0,0.001)",
                  ],
                },
              },
              "city-circles",
            );
            map.addLayer(
              {
                id: "admin-border",
                type: "line",
                source: "admin",
                paint: { "line-color": "#b0bfcc", "line-width": 0.5 },
              },
              "city-circles",
            );

            currentAdminIsoRef.current = iso;
          } catch (err) {
            console.error("Failed to load admin regions:", err);
          }
        })();
      }
    }

    setGlobeCountryTarget(null);
  }, [globeCountryTarget, mapReady, setGlobeCountryTarget]);

  // ── 4. 도시 검색 → 글로브 카메라 이동 ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedCityCoords) return;
    if (skipCityFlyRef.current) {
      skipCityFlyRef.current = false;
      return;
    }
    map.flyTo({
      center: [selectedCityCoords.lng, selectedCityCoords.lat],
      zoom: 3.7,
      duration: 1600,
    });
  }, [selectedCityCoords, mapReady]);

  // ── 5. 추천 결과 Top3 메달 마커 ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    medalMarkersRef.current.forEach((m) => m.remove());
    medalMarkersRef.current = [];

    if (!isRecommendActive || medalRankMap.size === 0) return;

    cities.forEach((city) => {
      const rank = medalRankMap.get(city.cityId);
      if (!rank) return;

      const el = document.createElement("img");
      el.src = MEDAL_IMGS[rank];
      el.style.width = "36px";
      el.style.height = "36px";
      el.style.pointerEvents = "none";

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([city.longitude, city.latitude])
        .addTo(map);

      medalMarkersRef.current.push(marker);
    });
  }, [isRecommendActive, medalRankMap, cities, mapReady]);

  // ── 6. 선택된 도시 삼각형 마커 ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    if (!selectedCityId) return;

    const city = cities.find((c) => c.cityId === selectedCityId);
    if (!city || (city.latitude === 0 && city.longitude === 0)) return;

    const el = document.createElement("div");
    el.innerHTML = `<svg width="16" height="12" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg"><polygon points="8,12 0,0 16,0" fill="#FF0000" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    el.style.pointerEvents = "none";

    selectedMarkerRef.current = new maplibregl.Marker({
      element: el,
      anchor: "bottom",
      offset: [0, -12],
    })
      .setLngLat([city.longitude, city.latitude])
      .addTo(map);
  }, [selectedCityId, cities, mapReady]);

  // ── 7. 서울 → 선택 도시 비행 경로 애니메이션 ──────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainer.current;

    // 이전 애니메이션 정리
    if (flightAnimRef.current !== null) {
      cancelAnimationFrame(flightAnimRef.current);
      flightAnimRef.current = null;
    }
    flightStartTimeRef.current = null;
    if (flightOverlayRef.current) {
      flightOverlayRef.current.remove();
      flightOverlayRef.current = null;
    }
    if (map) {
      if (map.getLayer("flight-arc")) map.removeLayer("flight-arc");
      if (map.getSource("flight-arc")) map.removeSource("flight-arc");
    }

    if (!map || !mapReady || !selectedCityCoords || !container) return;

    const dest: [number, number] = [
      selectedCityCoords.lng,
      selectedCityCoords.lat,
    ];
    if (
      Math.abs(dest[0] - SEOUL[0]) < 0.01 &&
      Math.abs(dest[1] - SEOUL[1]) < 0.01
    )
      return;

    const rawArc = limitArcPeakLatitude(greatCircleArc(SEOUL, dest, 600));

    // 선 렌더링용: 안티메리디안에서 분리 → MultiLineString (직선 아티팩트 방지)
    const lineSegments = splitAtAntimeridian(rawArc);

    // 애니메이션용: 경도 연속화 → 메르카토르 등거리 리샘플 (map.project 정확도)
    const arcPoints = resampleByMercatorDistance(
      normalizeLongitudes(rawArc),
      200,
    );

    // 호 선 레이어
    map.addSource("flight-arc", {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "MultiLineString", coordinates: lineSegments },
        properties: {},
      },
    });
    map.addLayer({
      id: "flight-arc",
      type: "line",
      source: "flight-arc",
      paint: {
        "line-color": "#93c5fd",
        "line-width": 1.5,
        "line-opacity": 0.5,
        "line-dasharray": [4, 3],
      },
    });

    // ── CSS 직접 제어 오버레이 (setLngLat 대신 map.project + transform 사용) ──
    // mapContainer는 MapLibre가 overflow:hidden을 적용하므로
    // 부모 요소(position:relative 외곽 div)에 붙여야 경계 밖 좌표도 보임
    const outerEl = container.parentElement as HTMLDivElement;
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:hidden;";
    outerEl.appendChild(overlay);
    flightOverlayRef.current = overlay;

    // 비행기 SVG (위쪽=북 기준)
    const planeEl = document.createElement("div");
    planeEl.style.cssText =
      "position:absolute;width:40px;height:40px;transform-origin:20px 20px;will-change:transform;";
    planeEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
      <path fill="#facc15" stroke="#1a2e4a" stroke-width="0.8"
        d="M12 2c-.6 0-1 .4-1 1v7.3L4 14v2l7-2v4.2l-2 1.3V21l3-.8 3 .8v-1.5l-2-1.3V14l7 2v-2l-7-3.7V3c0-.6-.4-1-1-1z"/>
    </svg>`;
    overlay.appendChild(planeEl);

    // 비행 시간 라벨
    const durationText = minDurationText
      ? parseDurationText(minDurationText)
      : null;
    const labelEl = document.createElement("div");
    labelEl.style.cssText =
      "position:absolute;white-space:nowrap;will-change:transform;transform-origin:50% 100%;";
    if (durationText) {
      labelEl.innerHTML = `<span style="display:inline-block;background:rgba(15,23,42,0.78);color:#e2e8f0;font-size:15px;font-weight:600;padding:2px 7px;border-radius:10px;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.15);">${durationText}</span>`;
    }
    overlay.appendChild(labelEl);

    const PLANE_HALF = 20; // 28/2
    const LABEL_GAP = 10; // 비행기 위 간격(px)

    const animate = (timestamp: number) => {
      if (flightStartTimeRef.current === null)
        flightStartTimeRef.current = timestamp;
      const elapsed = timestamp - flightStartTimeRef.current;

      // 무한 루프: 도착 후 서울로 즉시 복귀
      const t = (elapsed % FLIGHT_DURATION_MS) / FLIGHT_DURATION_MS;

      // 포인트 간 선형 보간으로 픽셀 단위 부드러운 이동
      const rawIdx = t * (arcPoints.length - 1);
      const i0 = Math.floor(rawIdx);
      const i1 = Math.min(i0 + 1, arcPoints.length - 1);
      const frac = rawIdx - i0;

      // 연속 경도로 보간 (방위각 계산 정확도 유지)
      const lng =
        arcPoints[i0][0] + (arcPoints[i1][0] - arcPoints[i0][0]) * frac;
      const lat =
        arcPoints[i0][1] + (arcPoints[i1][1] - arcPoints[i0][1]) * frac;

      // 방위각 계산: 연속 경도 그대로 사용 (안티메리디안에서 방향 안 깨짐)
      const bearingNext = arcPoints[Math.min(i0 + 1, arcPoints.length - 1)];
      const bearing = getBearing([lng, lat], bearingNext);

      // 카메라 중심 기준으로 가장 가까운 월드 카피의 경도를 선택
      // map.getCenter().lng는 패닝 시 ±180 범위를 벗어날 수 있음 (예: 퀘벡 쪽으로 패닝하면 -71° 등)
      // 단순 [-180,180] 래핑 대신 centerLng ±180° 범위로 맞춰 현재 화면의 카피를 정확히 찾음
      const centerLng = map.getCenter().lng;
      let projLng = lng % 360;
      if (projLng > 180) projLng -= 360;
      if (projLng < -180) projLng += 360;
      while (projLng - centerLng > 180) projLng -= 360;
      while (projLng - centerLng < -180) projLng += 360;
      const px = map.project([projLng, lat]);

      // translate3d: GPU 컴포지팅 레이어로 분리
      planeEl.style.transform = `translate3d(${px.x - PLANE_HALF}px,${px.y - PLANE_HALF}px,0) rotate(${bearing}deg)`;

      if (durationText) {
        // 라벨은 비행기 중심 위에 배치
        const labelW = labelEl.offsetWidth;
        labelEl.style.transform = `translate3d(${px.x - labelW / 2}px,${px.y - PLANE_HALF - labelEl.offsetHeight - LABEL_GAP}px,0)`;
      }

      flightAnimRef.current = requestAnimationFrame(animate);
    };

    flightAnimRef.current = requestAnimationFrame(animate);

    return () => {
      if (flightAnimRef.current !== null) {
        cancelAnimationFrame(flightAnimRef.current);
        flightAnimRef.current = null;
      }
      overlay.remove();
      try {
        if (map.getLayer("flight-arc")) map.removeLayer("flight-arc");
        if (map.getSource("flight-arc")) map.removeSource("flight-arc");
      } catch (_) {
        // 컴포넌트 언마운트 시 지도가 이미 파괴된 경우 무시
      }
    };
  }, [selectedCityCoords, mapReady, minDurationText]);

  // ── 8. 비행 추적 모드: 카메라가 서울 출발 비행기를 따라가는 애니메이션 ─────
  const TRACK_DURATION_MS = 8000;
  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainer.current;
    if (!map || !mapReady || !planeTrackingDest || !container) return;

    const dest: [number, number] = [
      planeTrackingDest.lng,
      planeTrackingDest.lat,
    ];

    const TRACK_RASTER_SRC = "plane-track-raster";
    const TRACK_RASTER_LAYER = "plane-track-raster-layer";

    const FADE_DURATION = 600; // ms

    const addTrackingRaster = () => {
      try {
        if (!map.getSource(TRACK_RASTER_SRC)) {
          map.addSource(TRACK_RASTER_SRC, {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
          });
        }
        if (!map.getLayer(TRACK_RASTER_LAYER)) {
          map.addLayer(
            {
              id: TRACK_RASTER_LAYER,
              type: "raster",
              source: TRACK_RASTER_SRC,
              paint: { "raster-opacity": 0 }, // 투명하게 시작
            },
            "country-border",
          );
        }
        // fade-in
        const start = performance.now();
        const fadeIn = (now: number) => {
          if (!mapRef.current) return;
          const p = Math.max(0, Math.min((now - start) / FADE_DURATION, 1));
          try {
            map.setPaintProperty(TRACK_RASTER_LAYER, "raster-opacity", p);
          } catch (_) {}
          if (p < 1) requestAnimationFrame(fadeIn);
        };
        requestAnimationFrame(fadeIn);
      } catch (_) {}
    };

    const removeTrackingRaster = () => {
      if (!mapRef.current || !map.getLayer(TRACK_RASTER_LAYER)) return;
      // fade-out 후 레이어/소스 제거
      const start = performance.now();
      const fadeOut = (now: number) => {
        if (!mapRef.current || !map.getLayer(TRACK_RASTER_LAYER)) return;
        const p = Math.min((now - start) / FADE_DURATION, 1);
        try {
          map.setPaintProperty(TRACK_RASTER_LAYER, "raster-opacity", 1 - p);
        } catch (_) {}
        if (p < 1) {
          requestAnimationFrame(fadeOut);
        } else {
          try {
            if (map.getLayer(TRACK_RASTER_LAYER))
              map.removeLayer(TRACK_RASTER_LAYER);
            if (map.getSource(TRACK_RASTER_SRC))
              map.removeSource(TRACK_RASTER_SRC);
          } catch (_) {}
        }
      };
      requestAnimationFrame(fadeOut);
    };

    const startTrackingAnim = () => {
      // 기존 애니메이션 정리
      if (flightAnimRef.current !== null) {
        cancelAnimationFrame(flightAnimRef.current);
        flightAnimRef.current = null;
      }
      if (flightOverlayRef.current) {
        flightOverlayRef.current.remove();
        flightOverlayRef.current = null;
      }

      // 위성 실사 타일 활성화
      addTrackingRaster();

      const rawArc = limitArcPeakLatitude(greatCircleArc(SEOUL, dest, 600));
      const arcPoints = resampleByMercatorDistance(
        normalizeLongitudes(rawArc),
        200,
      );

      const outerEl = container.parentElement as HTMLDivElement;
      const overlay = document.createElement("div");
      overlay.style.cssText =
        "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;overflow:hidden;";
      outerEl.appendChild(overlay);
      flightOverlayRef.current = overlay;

      const planeEl = document.createElement("div");
      planeEl.style.cssText =
        "position:absolute;width:40px;height:40px;transform-origin:20px 20px;will-change:transform;";
      planeEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
        <path fill="#facc15" stroke="#1a2e4a" stroke-width="0.8"
          d="M12 2c-.6 0-1 .4-1 1v7.3L4 14v2l7-2v4.2l-2 1.3V21l3-.8 3 .8v-1.5l-2-1.3V14l7 2v-2l-7-3.7V3c0-.6-.4-1-1-1z"/>
      </svg>`;
      overlay.appendChild(planeEl);

      // 비행기 연기(contrail) 캔버스
      const trailCanvas = document.createElement("canvas");
      trailCanvas.style.cssText =
        "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
      trailCanvas.width = overlay.offsetWidth || window.innerWidth;
      trailCanvas.height = overlay.offsetHeight || window.innerHeight;
      overlay.insertBefore(trailCanvas, planeEl); // 비행기 아래에 렌더
      const trailCtx = trailCanvas.getContext("2d")!;

      // 과거 위경도 좌표 저장 (카메라가 움직여도 재투영 가능)
      const trailGeoPoints: Array<[number, number]> = [];
      const TRAIL_MAX = 50;

      const PLANE_HALF = 20;
      let startTime: number | null = null;

      const animate = (timestamp: number) => {
        if (startTime === null) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const t = Math.min(elapsed / TRACK_DURATION_MS, 1);

        const rawIdx = t * (arcPoints.length - 1);
        const i0 = Math.floor(rawIdx);
        const i1 = Math.min(i0 + 1, arcPoints.length - 1);
        const frac = rawIdx - i0;

        const lng =
          arcPoints[i0][0] + (arcPoints[i1][0] - arcPoints[i0][0]) * frac;
        const lat =
          arcPoints[i0][1] + (arcPoints[i1][1] - arcPoints[i0][1]) * frac;

        // 카메라를 비행기 위치로 이동 (추적 효과)
        map.jumpTo({ center: [lng, lat] });

        // 트레일 포인트 추가 (매 프레임 과거 위치 누적)
        trailGeoPoints.push([lng, lat]);
        if (trailGeoPoints.length > TRAIL_MAX) trailGeoPoints.shift();

        // 캔버스 초기화 후 연기 재투영 렌더
        trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
        trailGeoPoints.forEach(([tLng, tLat], i) => {
          const ratio = i / (trailGeoPoints.length - 1 || 1); // 0(오래됨) ~ 1(최근)
          const alpha = ratio * 0.12;
          const radius = 1.5 + ratio * 3;
          const tPx = map.project([tLng, tLat]);
          trailCtx.beginPath();
          trailCtx.arc(tPx.x, tPx.y, radius, 0, Math.PI * 2);
          trailCtx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          trailCtx.fill();
        });

        const px = map.project([lng, lat]);
        const bearingNext = arcPoints[Math.min(i0 + 1, arcPoints.length - 1)];
        const bearing = getBearing([lng, lat], bearingNext);
        planeEl.style.transform = `translate3d(${px.x - PLANE_HALF}px,${px.y - PLANE_HALF}px,0) rotate(${bearing}deg)`;

        if (t < 1) {
          flightAnimRef.current = requestAnimationFrame(animate);
        } else {
          // 애니메이션 완료: 정리 후 목적지 최종 줌인
          overlay.remove();
          flightOverlayRef.current = null;
          flightAnimRef.current = null;
          removeTrackingRaster();
          setPlaneTrackingDest(null);
          map.flyTo({ center: dest, zoom: 3.7, duration: 1200 });
          setSelectedCityCoords({ lat: dest[1], lng: dest[0] });
        }
      };

      flightAnimRef.current = requestAnimationFrame(animate);
    };

    // 카메라가 서울에 도착한 후 비행 추적 시작
    map.once("moveend", startTrackingAnim);

    return () => {
      map.off("moveend", startTrackingAnim);
      if (flightAnimRef.current !== null) {
        cancelAnimationFrame(flightAnimRef.current);
        flightAnimRef.current = null;
      }
      if (flightOverlayRef.current) {
        flightOverlayRef.current.remove();
        flightOverlayRef.current = null;
      }
      removeTrackingRaster();
    };
  }, [planeTrackingDest, mapReady, setPlaneTrackingDest]);

  // ── 9. 위성 지도 토글 ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const SRC = "base-satellite-src";
    const LAYER = "base-satellite-layer";
    const FADE = 500;

    if (isSatellite) {
      try {
        if (!map.getSource(SRC)) {
          map.addSource(SRC, {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
          });
        }
        if (!map.getLayer(LAYER)) {
          map.addLayer(
            {
              id: LAYER,
              type: "raster",
              source: SRC,
              paint: { "raster-opacity": 0 },
            },
            "country-border",
          );
        }
        const t0 = performance.now();
        const fadeIn = (now: number) => {
          const p = Math.max(0, Math.min((now - t0) / FADE, 1));
          try {
            map.setPaintProperty(LAYER, "raster-opacity", p);
          } catch (_) {}
          if (p < 1) requestAnimationFrame(fadeIn);
        };
        requestAnimationFrame(fadeIn);
      } catch (_) {}
    } else {
      if (!map.getLayer(LAYER)) return;
      const t0 = performance.now();
      const fadeOut = (now: number) => {
        const p = Math.max(0, Math.min((now - t0) / FADE, 1));
        try {
          map.setPaintProperty(LAYER, "raster-opacity", 1 - p);
        } catch (_) {}
        if (p < 1) {
          requestAnimationFrame(fadeOut);
        } else {
          try {
            if (map.getLayer(LAYER)) map.removeLayer(LAYER);
            if (map.getSource(SRC)) map.removeSource(SRC);
          } catch (_) {}
        }
      };
      requestAnimationFrame(fadeOut);
    }
  }, [isSatellite, mapReady]);

  const legendRight = isRightPanelOpen
    ? isRightPanelCollapsed
      ? 48
      : 348
    : 16;
  const zoomLeft = isLeftSidebarCollapsed ? 32 : 308;

  // 겹침 감지
  const ZOOM_W = 196; // 줌 컨트롤 너비
  const BTN_W = 176; // 물가/위험도 버튼 총 너비 (버튼 2개 + gap)
  const LEFT_PANEL_RIGHT = isLeftSidebarCollapsed ? 0 : 308; // 왼쪽 패널 오른쪽 끝
  const RIGHT_PANEL_LEFT =
    isRightPanelOpen && !isRightPanelCollapsed ? width - 320 : width; // 오른쪽 패널 왼쪽 끝

  const btnLeft = width / 2 - BTN_W / 2;
  const btnRight = width / 2 + BTN_W / 2;

  const hideZoom = zoomLeft + ZOOM_W + 8 > btnLeft; // 줌이 버튼과 겹침
  const hideButtons =
    btnLeft < LEFT_PANEL_RIGHT + 8 || btnRight > RIGHT_PANEL_LEFT - 8; // 버튼이 패널과 겹침

  return (
    <div style={{ width, height, position: "relative" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* 툴팁 */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y - 36,
            background: "rgba(15,23,42,0.85)",
            color: "#fff",
            fontSize: 12,
            padding: "5px 10px",
            borderRadius: 6,
            pointerEvents: "none",
            zIndex: 9999,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600 }}>{tooltip.name}</div>
          {tooltip.sub && (
            <div style={{ fontSize: 11, opacity: 0.7 }}>{tooltip.sub}</div>
          )}
        </div>
      )}

      {/* 시각화 모드 범례 */}
      {visualMode !== "none" && (
        <div
          style={{
            position: "absolute",
            bottom: 72,
            right: legendRight,
            background: "rgba(255,255,255,0.93)",
            borderRadius: 8,
            padding: "8px 12px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
            zIndex: 50,
            transition: "right 0.3s ease",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#334155",
              marginBottom: 6,
            }}
          >
            {visualMode === "cost"
              ? "나라별 1일 평균 물가"
              : "나라별 여행 위험도"}
          </div>
          {(visualMode === "cost"
            ? COST_CHOROPLETH
            : [
                ...DANGER_CHOROPLETH.slice(0, -2),
                {
                  color: DANGER_CHOROPLETH[DANGER_CHOROPLETH.length - 1].color,
                  label: "철수권고/여행금지",
                },
              ]
          ).map(({ label, color }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: color,
                  flexShrink: 0,
                  opacity: 0.72,
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              />
              <span style={{ fontSize: 11, color: "#475569" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* 시각화 모드 토글 버튼 */}
      {!hideButtons && !isSatellite && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 2,
            zIndex: 50,
          }}
        >
          {(["cost", "danger"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() =>
                setVisualMode((prev) => (prev === mode ? "none" : mode))
              }
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                transition: "all 0.2s",
                background:
                  visualMode === mode ? "#1e40af" : "rgba(255,255,255,0.85)",
                color: visualMode === mode ? "#fff" : "#475569",
                boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              }}
            >
              {mode === "cost" ? "💰 물가" : "⚠️ 위험도"}
            </button>
          ))}
        </div>
      )}

      {/* 위성/기본 지도 스타일 토글 버튼 (줌 컨트롤 위) */}
      {!hideZoom && (
        <button
          onClick={() => setIsSatellite((v) => !v)}
          title={isSatellite ? "기본 지도로 전환" : "위성 지도로 전환"}
          style={{
            position: "absolute",
            bottom: 120,
            left: zoomLeft - 16,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            transition: "all 0.3s ease",
            background: isSatellite
              ? "rgba(15,23,42,0.85)"
              : "rgba(255,255,255,0.9)",
            color: isSatellite ? "#e2e8f0" : "#334155",
            boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
            backdropFilter: "blur(8px)",
            minWidth: 180,
          }}
        >
          <span style={{ fontSize: 15 }}>{isSatellite ? "🗺️" : "🛰️"}</span>
          {isSatellite ? "기본 지도" : "위성 지도"}
        </button>
      )}

      {/* 줌 레벨 컨트롤 */}
      {!hideZoom && (
        <ZoomControl
          zoom={currentZoom}
          onZoom={(z: number) => mapRef.current?.setZoom(z)}
          left={zoomLeft}
        />
      )}
    </div>
  );
}
