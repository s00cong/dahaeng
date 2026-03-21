import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { feature as topoFeature } from "topojson-client";
import { useUiStore } from "@/stores/uiStore";
import { useCityList } from "@/hooks/city/useCityList";
import { queryClient } from "@/lib/queryClient";
import { cityApi } from "@/api/city.api";
import { queryKeys } from "@/utils/queryKeys";
import { COUNTRY_NAME_KO } from "@/data/countryNameKo";
import { CITY_NAME_KO } from "@/data/cityNameKo";
import { COUNTRY_NAME_ISO3 } from "@/data/countryNameIso3";
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
function getMarkerColor(score: number | null | undefined): string {
  if (score == null) return "#3b82f6";
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#3b82f6";
  return "#f59e0b";
}

const COST_COLORS_8 = [
  "#047857", "#10b981", "#6ee7b7", "#bef264",
  "#fbbf24", "#fb923c", "#ef4444", "#7f1d1d",
] as const;

function calcCostThresholds(costs: number[]): { max: number; color: string; label: string }[] {
  const sorted = [...costs].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return [];
  const p = (pct: number) => sorted[Math.min(Math.floor((pct / 100) * n), n - 1)];
  const fmt = (v: number) => `${Math.round(v / 10000)}만`;
  const pcts = [12.5, 25, 37.5, 50, 62.5, 75, 87.5];
  const thresholds = pcts.map(p);
  return [
    { max: thresholds[0], color: COST_COLORS_8[0], label: `${fmt(sorted[0])} 미만` },
    { max: thresholds[1], color: COST_COLORS_8[1], label: `${fmt(thresholds[0])} ~ ${fmt(thresholds[1])}` },
    { max: thresholds[2], color: COST_COLORS_8[2], label: `${fmt(thresholds[1])} ~ ${fmt(thresholds[2])}` },
    { max: thresholds[3], color: COST_COLORS_8[3], label: `${fmt(thresholds[2])} ~ ${fmt(thresholds[3])}` },
    { max: thresholds[4], color: COST_COLORS_8[4], label: `${fmt(thresholds[3])} ~ ${fmt(thresholds[4])}` },
    { max: thresholds[5], color: COST_COLORS_8[5], label: `${fmt(thresholds[4])} ~ ${fmt(thresholds[5])}` },
    { max: thresholds[6], color: COST_COLORS_8[6], label: `${fmt(thresholds[5])} ~ ${fmt(thresholds[6])}` },
    { max: Infinity,      color: COST_COLORS_8[7], label: `${fmt(thresholds[6])} 초과` },
  ];
}

// ── GeoJSON 좌표 전체 추출 (나라 bbox 계산용) ────────────────────────────────
function getAllCoords(geom: GeoJSON.Geometry): number[][] {
  if (geom.type === "Polygon") return (geom.coordinates as number[][][]).flat();
  if (geom.type === "MultiPolygon") return (geom.coordinates as number[][][][]).flat(2);
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
      coordinates: (geom.coordinates as number[][][][]).map((poly) => poly.map(fixRing)),
    };
  }
  return geom;
}

function fixAntimeridian(fc: GeoJSON.FeatureCollection): GeoJSON.FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f) =>
      f.geometry ? { ...f, geometry: fixGeometry(f.geometry) } : f,
    ),
  };
}

// ── 줌 레벨 UI ────────────────────────────────────────────────────────────────
const ZOOM_STEPS = [
  { zoom: 1,   label: "세계" },
  { zoom: 2,   label: "대륙" },
  { zoom: 3,   label: "국가" },
  { zoom: 4,   label: "지역" },
  { zoom: 5,   label: "도시" },
] as const;

function getZoomLabel(z: number): string {
  if (z < 1.5) return "세계";
  if (z < 2.5) return "대륙";
  if (z < 3.5) return "국가";
  if (z < 4.5) return "지역";
  return "도시";
}

function ZoomControl({ zoom, onZoom, left }: { zoom: number; onZoom: (z: number) => void; left: number }) {
  const MIN = 1;
  const MAX = 5;
  const pct = ((zoom - MIN) / (MAX - MIN)) * 100;

  return (
    <div style={{
      position: "absolute", bottom: 24, left, zIndex: 50, transition: "left 0.3s ease",
      background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)",
      borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
      padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6, minWidth: 180,
    }}>
      {/* 상단: 현재 단계 라벨 + 줌 수치 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e40af" }}>
          {getZoomLabel(zoom)}
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
          {zoom.toFixed(1)}
        </span>
      </div>

      {/* 슬라이더 */}
      <input
        type="range"
        min={MIN} max={MAX} step={0.1}
        value={zoom}
        onChange={(e) => onZoom(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#3b82f6", cursor: "pointer" }}
      />

      {/* 하단: 단계 라벨들 */}
      <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
        {ZOOM_STEPS.map(({ zoom: sz, label }) => {
          const stepPct = ((sz - MIN) / (MAX - MIN)) * 100;
          const isActive = Math.abs(pct - stepPct) < 8;
          return (
            <button
              key={label}
              onClick={() => onZoom(sz)}
              style={{
                background: "none", border: "none", padding: 0, cursor: "pointer",
                fontSize: 10, fontWeight: isActive ? 700 : 400,
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

const COUNTRY_FLY_TO: Record<string, { center: [number, number]; zoom: number }> = {
  Russia:                      { center: [90,   62],  zoom: 2 },
  "United States of America":  { center: [-98,  39],  zoom: 3 },
  Canada:                      { center: [-96,  60],  zoom: 3 },
  France:                      { center: [2,    46],  zoom: 4 },
  "United Kingdom":            { center: [-2,   54],  zoom: 4 },
  Norway:                      { center: [15,   65],  zoom: 3 },
  Indonesia:                   { center: [118, -2],   zoom: 3 },
  Antarctica:                  { center: [0,   -90],  zoom: 2 },
};

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#0d1b2e" } }],
};

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
  } = useUiStore();

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const hoveredIdRef = useRef<number | null>(null);
  const selectedIdRef = useRef<number | null>(null);

  const [clickedName, setClickedName] = useState<string | null>(null);
  const [clickedIso, setClickedIso] = useState<string | null>(null);
  const clickedNameRef = useRef<string | null>(null);
  clickedNameRef.current = clickedName;
  const currentAdminIsoRef = useRef<string | null>(null);

  const [tooltip, setTooltip] = useState<{ name: string; sub?: string; x: number; y: number } | null>(null);
  const [visualMode, setVisualMode] = useState<"none" | "cost" | "danger">("none");
  const [currentZoom, setCurrentZoom] = useState(1.5);
  const medalMarkersRef = useRef<maplibregl.Marker[]>([]);
  const countriesDataRef = useRef<GeoJSON.FeatureCollection | null>(null);
  // 맵 핀포인트 직접 클릭 시 flyTo 스킵 플래그
  const skipCityFlyRef = useRef(false);

  const { data: citiesFromApi } = useCityList();
  const cities = citiesFromApi ?? [];

  const matchedCityIds = useMemo<Set<number>>(() => {
    if (!isRecommendActive || recommendResults.length === 0) return new Set();
    const names = new Set(recommendResults.map((r) => r.city));
    return new Set(cities.filter((c) => names.has(c.cityName)).map((c) => c.cityId));
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

  const costThresholds = useMemo(() => {
    const costs = cities.map((c) => c.estimatedBudget / 7).filter((v) => v > 0);
    return calcCostThresholds(costs);
  }, [cities]);

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

      const topo = await fetch("/geo/countries-50m.json").then((r) => r.json()) as any;
      const rawCountries = topoFeature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
      
      // 남극 제거
      rawCountries.features = rawCountries.features.filter(
        (f) => f.properties?.name !== "Antarctica",
      );
      
      const countries = fixAntimeridian(rawCountries);
      countriesDataRef.current = countries;

      map.addSource("countries", { type: "geojson", data: countries, generateId: true });
      map.addLayer({
        id: "country-fill",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false], "#bfdbfe",
            ["boolean", ["feature-state", "hover"], false], "#e2e8ef",
            "#F1F5F9",
          ],
        },
      });

      map.addLayer({
        id: "country-border",
        type: "line",
        source: "countries",
        paint: {
          "line-color": "#cfcfcf",
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.3, 5, 0.8, 10, 1.2],
        },
      });

      map.addSource("cities", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      
      map.addLayer({
        id: "city-heatmap",
        type: "heatmap",
        source: "cities",
        paint: {
          "heatmap-weight": ["get", "heatWeight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "#10b981",
            0.4, "#fbbf24",
            0.6, "#f97316",
            0.8, "#ef4444",
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
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 5, 10, 10],
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
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

        queryClient.prefetchQuery({
          queryKey: [...queryKeys.city.detail(cityId), false, null],
          queryFn: () => cityApi.getDetail(cityId, false),
          staleTime: 5 * 60 * 1000,
        });

        skipCityFlyRef.current = true;
        openRightPanel(cityId, imgUrl, { lat, lng });

        // 핀포인트가 속한 나라 감지 → 나라 선택 + 행정구역 폴리곤 표시
        const countryFeatures = map.queryRenderedFeatures(e.point, { layers: ["country-fill"] });
        if (!countryFeatures.length) return;

        const cf = countryFeatures[0];
        const countryId = cf.id as number;
        const countryName = (cf.properties as any).name as string;
        const iso = COUNTRY_NAME_ISO3[countryName] ?? null;

        // 이미 같은 나라가 선택되어 있으면 행정구역 재로드 불필요
        if (clickedNameRef.current === countryName) return;

        // 이전 선택 해제
        if (selectedIdRef.current !== null) {
          map.setFeatureState({ source: "countries", id: selectedIdRef.current }, { selected: false });
        }
        selectedIdRef.current = countryId;
        map.setFeatureState({ source: "countries", id: countryId }, { selected: true });
        setClickedName(countryName);
        setClickedIso(iso);

        // 행정구역 레이어 로드
        if (iso) {
          try {
            if (map.getLayer("admin-fill")) map.removeLayer("admin-fill");
            if (map.getLayer("admin-border")) map.removeLayer("admin-border");
            if (map.getSource("admin")) map.removeSource("admin");

            const topo = await fetch(`/geo_10m/countries/${iso}.topo.json`).then(r => r.json());
            const objKey = Object.keys(topo.objects)[0];
            const adminGeo = topoFeature(topo, topo.objects[objKey]) as any;

            map.addSource("admin", { type: "geojson", data: adminGeo, generateId: true });
            map.addLayer({
              id: "admin-fill",
              type: "fill",
              source: "admin",
              paint: {
                "fill-color": [
                  "case",
                  ["boolean", ["feature-state", "hover"], false], "rgba(99,179,237,0.3)",
                  "rgba(0,0,0,0.001)"
                ]
              }
            }, "city-circles");
            map.addLayer({
              id: "admin-border",
              type: "line",
              source: "admin",
              paint: { "line-color": "#b0bfcc", "line-width": 0.5 }
            }, "city-circles");

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
          map.setFeatureState({ source: "countries", id: hoveredIdRef.current }, { hover: false });
          hoveredIdRef.current = null;
        }
        map.getCanvas().style.cursor = "pointer";
        const enName = e.features[0].properties?.cityName as string;
        const koName = CITY_NAME_KO[enName];
        setTooltip({ name: koName ?? enName, sub: koName ? enName : undefined, x: e.originalEvent.clientX, y: e.originalEvent.clientY });
      });

      map.on("mouseleave", "city-hitbox", () => {
        map.getCanvas().style.cursor = "";
        setTooltip(null);
      });

      map.on("mousemove", "country-fill", (e) => {
        if (!e.features || e.features.length === 0) return;
        // 도시 핀포인트 위에 있으면 나라 hover 스킵
        const cityFeatures = map.queryRenderedFeatures(e.point, { layers: ["city-hitbox"] });
        if (cityFeatures.length > 0) {
          if (hoveredIdRef.current !== null) {
            map.setFeatureState({ source: "countries", id: hoveredIdRef.current }, { hover: false });
            hoveredIdRef.current = null;
          }
          return;
        }
        const f = e.features[0];
        const id = f.id as number;
        const name = (f.properties?.name ?? "") as string;
        if (hoveredIdRef.current !== null && hoveredIdRef.current !== id) {
          map.setFeatureState({ source: "countries", id: hoveredIdRef.current }, { hover: false });
        }
        hoveredIdRef.current = id;
        map.setFeatureState({ source: "countries", id }, { hover: true });
        map.getCanvas().style.cursor = "pointer";
        const koName = COUNTRY_NAME_KO[name] ?? name;
        setTooltip({ name: koName, x: e.originalEvent.clientX, y: e.originalEvent.clientY });
      });

      map.on("mouseleave", "country-fill", () => {
        if (hoveredIdRef.current !== null) {
          map.setFeatureState({ source: "countries", id: hoveredIdRef.current }, { hover: false });
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
        const cityFeatures = map.queryRenderedFeatures(ev.point, { layers: ["city-hitbox"] });
        if (cityFeatures.length > 0) return;
        const aid = ev.features[0].id as number;
        if (adminHoveredId !== null && adminHoveredId !== aid) {
          map.setFeatureState({ source: "admin", id: adminHoveredId }, { hover: false });
        }
        adminHoveredId = aid;
        map.setFeatureState({ source: "admin", id: aid }, { hover: true });
        const adminName = ev.features[0].properties?.shapeName ?? ev.features[0].properties?.name ?? "";
        setTooltip({ name: adminName, x: ev.originalEvent.clientX, y: ev.originalEvent.clientY });
      });

      map.on("mouseleave", "admin-fill", () => {
        if (adminHoveredId !== null) {
          map.setFeatureState({ source: "admin", id: adminHoveredId }, { hover: false });
          adminHoveredId = null;
        }
        setTooltip(null);
      });

      map.on("click", "country-fill", async (e) => {
        if (!e.features || e.features.length === 0) return;
        // 도시 핀포인트나 행정구역 위에서 클릭하면 나라 클릭 로직 스킵
        const cityFeatures = map.queryRenderedFeatures(e.point, { layers: ["city-hitbox"] });
        if (cityFeatures.length > 0) return;
        const adminFeatures = map.queryRenderedFeatures(e.point, { layers: ["admin-fill"] });
        if (adminFeatures.length > 0) return;

        const f = e.features[0];
        const id = f.id as number;
        const name = (f.properties as any).name;

        // 선택 취소 처리 (같은 나라 클릭 시)
        if (name === clickedNameRef.current) {
          if (selectedIdRef.current !== null) {
            map.setFeatureState({ source: "countries", id: selectedIdRef.current }, { selected: false });
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
          map.setFeatureState({ source: "countries", id: selectedIdRef.current }, { selected: false });
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
            const topo = await fetch(`/geo_10m/countries/${iso}.topo.json`).then(r => r.json());
            const objKey = Object.keys(topo.objects)[0];
            const adminGeo = topoFeature(topo, topo.objects[objKey]) as any;

            if (map.getLayer("admin-fill")) map.removeLayer("admin-fill");
            if (map.getLayer("admin-border")) map.removeLayer("admin-border");
            if (map.getSource("admin")) map.removeSource("admin");

            map.addSource("admin", { type: "geojson", data: adminGeo, generateId: true });
            map.addLayer({
              id: "admin-fill",
              type: "fill",
              source: "admin",
              paint: {
                "fill-color": [
                  "case",
                  ["boolean", ["feature-state", "hover"], false], "rgba(99,179,237,0.3)",
                  "rgba(0,0,0,0.001)"
                ]
              }
            }, "city-circles");

            map.addLayer({
              id: "admin-border",
              type: "line",
              source: "admin",
              paint: { "line-color": "#b0bfcc", "line-width": 0.5 }
            }, "city-circles");

            currentAdminIsoRef.current = iso;
          } catch (err) {
            console.error("Failed to load admin regions:", err);
          }
        }

        const flyTo = COUNTRY_FLY_TO[name];
        if (flyTo) map.flyTo({ center: flyTo.center, zoom: flyTo.zoom, duration: 800 });
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
    if (!map || !mapReady || cities.length === 0) return;
    const features: GeoJSON.Feature[] = cities.map((city) => {
      const isMatched = !isRecommendActive || matchedCityIds.has(city.cityId);
      const score = recommendScoreMap.get(city.cityName);
      
      // 히트맵 가중치 계산
      const heatWeight = visualMode === "cost" 
        ? Math.min((city.estimatedBudget / 7) / 200000, 1) 
        : visualMode === "danger" ? city.riskLevel / 4 : 0.5;

      let color = city.cityId === selectedCityId ? "#f59e0b" : !isMatched ? "#CBD5E1" : getMarkerColor(score);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [city.longitude, city.latitude] },
        properties: { 
          cityId: city.cityId, 
          cityName: city.cityName, 
          imgUrl: city.imgUrl, // 패널 사진 표시를 위해 필수
          lat: city.latitude, 
          lng: city.longitude, 
          color, 
          heatWeight 
        },
      };
    });
    const source = map.getSource("cities") as maplibregl.GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features });

    // 레이어 가시성 조절
    if (map.getLayer("city-heatmap")) {
      map.setLayoutProperty("city-heatmap", "visibility", visualMode !== "none" ? "visible" : "none");
    }
    if (map.getLayer("city-circles")) {
      map.setLayoutProperty("city-circles", "visibility", visualMode !== "none" ? "none" : "visible");
    }
  }, [cities, mapReady, isRecommendActive, matchedCityIds, recommendScoreMap, selectedCityId, visualMode]);

  useEffect(() => {
    if (mapRef.current) mapRef.current.resize();
  }, [width, height]);

  // ── 3. 나라 검색 → 글로브 카메라 이동 ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !globeCountryTarget || !countriesDataRef.current) return;

    const feature = countriesDataRef.current.features.find(
      (f) => f.properties?.name === globeCountryTarget,
    );

    if (feature?.geometry) {
      const coords = getAllCoords(feature.geometry);
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const flyTo = COUNTRY_FLY_TO[globeCountryTarget];
      if (flyTo) map.flyTo({ center: flyTo.center, zoom: flyTo.zoom, duration: 1600 });
      else map.flyTo({ center: [centerLng, centerLat], zoom: 4, duration: 1600 });
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
    map.flyTo({ center: [selectedCityCoords.lng, selectedCityCoords.lat], zoom: 3.7, duration: 1600 });
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

  const legendRight = isRightPanelOpen ? (isRightPanelCollapsed ? 48 : 348) : 16;
  const zoomLeft = isLeftSidebarCollapsed ? 32 : 308;

  return (
    <div style={{ width, height, position: "relative" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      
      {/* 툴팁 */}
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x + 12, top: tooltip.y - 36, background: "rgba(15,23,42,0.85)", color: "#fff", fontSize: 12, padding: "5px 10px", borderRadius: 6, pointerEvents: "none", zIndex: 9999, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600 }}>{tooltip.name}</div>
          {tooltip.sub && <div style={{ fontSize: 11, opacity: 0.7 }}>{tooltip.sub}</div>}
        </div>
      )}

      {/* 시각화 모드 범례 (Legend) */}
      {visualMode === "cost" && (
        <div style={{ position: "absolute", bottom: 72, right: legendRight, background: "rgba(255,255,255,0.93)", borderRadius: 8, padding: "8px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.18)", zIndex: 50, transition: "right 0.3s ease" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", marginBottom: 5 }}>1일 물가 (원)</div>
          {costThresholds.map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#475569" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {visualMode === "danger" && (
        <div style={{ position: "absolute", bottom: 72, right: legendRight, background: "rgba(255,255,255,0.93)", borderRadius: 8, padding: "8px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.18)", zIndex: 50, transition: "right 0.3s ease" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#334155", marginBottom: 5 }}>여행 위험도</div>
          {[
            { label: "안전", color: "#10b981" },
            { label: "여행유의", color: "#f59e0b" },
            { label: "여행주의", color: "#f97316" },
            { label: "여행자제/금지", color: "#ef4444" }
          ].map(({ label, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#475569" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* 시각화 모드 토글 버튼 */}
      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, zIndex: 50 }}>
        {(["cost", "danger"] as const).map((mode) => (
          <button key={mode} onClick={() => setVisualMode((prev) => prev === mode ? "none" : mode)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: visualMode === mode ? "#1e40af" : "rgba(255,255,255,0.85)", color: visualMode === mode ? "#fff" : "#475569", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
            {mode === "cost" ? "💰 물가" : "⚠️ 위험도"}
          </button>
        ))}
      </div>

      {/* 줌 레벨 컨트롤 */}
      <ZoomControl zoom={currentZoom} onZoom={(z: number) => mapRef.current?.setZoom(z)} left={zoomLeft} />
    </div>
  );
}
