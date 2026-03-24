import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { feature as topoFeature } from 'topojson-client';

const GLOBE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0a1628' },
    },
  ],
};

// ── 주요 도시 좌표 (경도, 위도) ────────────────────────────────────
const CITY_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: (
    [
      [127.0, 37.5],   // 서울
      [139.7, 35.7],   // 도쿄
      [116.4, 39.9],   // 베이징
      [121.5, 31.2],   // 상하이
      [-74.0, 40.7],   // 뉴욕
      [-0.1, 51.5],    // 런던
      [2.3, 48.9],     // 파리
      [151.2, -33.9],  // 시드니
      [72.8, 19.1],    // 뭄바이
      [55.3, 25.2],    // 두바이
      [103.8, 1.3],    // 싱가포르
      [-46.6, -23.5],  // 상파울루
      [31.2, 30.1],    // 카이로
      [37.6, 55.8],    // 모스크바
      [-118.2, 34.1],  // 로스앤젤레스
      [-87.6, 41.9],   // 시카고
      [100.5, 13.8],   // 방콕
      [106.8, -6.2],   // 자카르타
      [28.9, 41.0],    // 이스탄불
      [13.4, 52.5],    // 베를린
      [120.9, 14.6],   // 마닐라
      [-99.1, 19.4],   // 멕시코시티
      [3.4, 6.5],      // 라고스
      [36.8, -1.3],    // 나이로비
    ] as [number, number][]
  ).map(([lng, lat]) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [lng, lat] },
    properties: {},
  })),
};

// ── 구면 대원(great-circle) 호 계산 ───────────────────────────────
function greatCircleArc(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number],
  steps = 60,
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(lat1), λ1 = toRad(lng1);
  const φ2 = toRad(lat2), λ2 = toRad(lng2);
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((φ2 - φ1) / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
    ),
  );
  if (d === 0) return [[lng1, lat1]];
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    pts.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return pts;
}

// ── 항공 노선 ──────────────────────────────────────────────────────
const ROUTES: [[number, number], [number, number]][] = [
  [[127.0, 37.5], [-74.0, 40.7]],   // 서울 → 뉴욕
  [[139.7, 35.7], [-0.1, 51.5]],    // 도쿄 → 런던
  [[103.8, 1.3], [2.3, 48.9]],      // 싱가포르 → 파리
  [[72.8, 19.1], [-118.2, 34.1]],   // 뭄바이 → LA
  [[151.2, -33.9], [55.3, 25.2]],   // 시드니 → 두바이
  [[-46.6, -23.5], [-0.1, 51.5]],   // 상파울루 → 런던
  [[36.8, -1.3], [116.4, 39.9]],    // 나이로비 → 베이징
  [[-74.0, 40.7], [2.3, 48.9]],     // 뉴욕 → 파리
  [[127.0, 37.5], [103.8, 1.3]],    // 서울 → 싱가포르
  [[116.4, 39.9], [55.3, 25.2]],    // 베이징 → 두바이
];

const ARC_GEOJSON: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: ROUTES.map(([from, to]) => ({
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: greatCircleArc(from, to) },
    properties: {},
  })),
};

// ── 점선 이동 애니메이션 시퀀스 (dash=3, gap=5, 16프레임/사이클) ──
function buildDashSequence(dash: number, gap: number, frames: number): number[][] {
  const T = dash + gap;
  return Array.from({ length: frames }, (_, i) => {
    const o = (i / frames) * T;
    let seq: number[];
    if (o <= dash) {
      seq = [+(dash - o).toFixed(2), gap, +o.toFixed(2)];
    } else {
      const gc = +(o - dash).toFixed(2);
      seq = [0, +(gap - gc).toFixed(2), dash, gc];
    }
    // 꼬리 0 제거
    while (seq.length > 2 && seq[seq.length - 1] === 0) seq.pop();
    return seq;
  });
}

const DASH_SEQ = buildDashSequence(3, 5, 16);

interface GlobeLoginBackgroundProps {
  phase: 'idle' | 'zoomIn';
  onAnimationEnd?: () => void;
}

export function GlobeLoginBackground({ phase, onAnimationEnd }: GlobeLoginBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef(phase);
  const [darkOverlay, setDarkOverlay] = useState(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // ── 지도 초기화 ─────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: GLOBE_STYLE,
      center: [127.5, 20],
      zoom: 2.2,
      interactive: false,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on('load', async () => {
      // globe projection
      try { (map as any).setProjection({ type: 'globe' }); } catch { /* ignore */ }

      // 우주 + 대기권 fog
      try {
        const fogCapableMap = map as maplibregl.Map & {
          setFog?: (options: unknown) => void;
        };
        fogCapableMap.setFog?.({
          'space-color': '#000010',
          'star-intensity': 0.85,
          color: '#1a2744',
          'high-color': '#0d3b8e',
          'horizon-blend': 0.04,
        });
      } catch { /* ignore */ }

      // 국가 경계선
      try {
        const topo = await fetch('/geo/countries-50m.json').then((r) => r.json()) as any;
        const countries = topoFeature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
        countries.features = countries.features.filter(
          (f) => f.properties?.name !== 'Antarctica',
        );
        map.addSource('countries', { type: 'geojson', data: countries });
        map.addLayer({
          id: 'country-fill',
          type: 'fill',
          source: 'countries',
          paint: { 'fill-color': '#1e3a5f', 'fill-opacity': 0.9 },
        });
        map.addLayer({
          id: 'country-border',
          type: 'line',
          source: 'countries',
          paint: { 'line-color': '#4a9eff', 'line-width': 0.6, 'line-opacity': 0.7 },
        });
      } catch { /* ignore */ }

      // 항공 노선 점선
      map.addSource('arcs', { type: 'geojson', data: ARC_GEOJSON });
      map.addLayer({
        id: 'arc-lines',
        type: 'line',
        source: 'arcs',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#7ec8e3',
          'line-width': 0.9,
          'line-opacity': 0.45,
          'line-dasharray': DASH_SEQ[0],
        },
      });

      // 도시 빛 — 글로우 (외곽)
      map.addSource('cities', { type: 'geojson', data: CITY_GEOJSON });
      map.addLayer({
        id: 'city-glow',
        type: 'circle',
        source: 'cities',
        paint: {
          'circle-radius': 9,
          'circle-color': '#4af0ff',
          'circle-opacity': 0.2,
          'circle-blur': 1,
        },
      });
      // 도시 빛 — 중심 (코어)
      map.addLayer({
        id: 'city-core',
        type: 'circle',
        source: 'cities',
        paint: {
          'circle-radius': 2,
          'circle-color': '#e0f4ff',
          'circle-opacity': 0.9,
          'circle-blur': 0.15,
        },
      });

      // 통합 애니메이션 루프
      let lng = 127.5;
      let frame = 0;
      const animate = () => {
        if (phaseRef.current === 'zoomIn') return;

        // 지구 자동 회전
        lng += 0.12;
        map.setCenter([lng % 360, 20]);

        // 점선 이동 (2프레임마다 → ≈30fps)
        if (frame % 2 === 0) {
          const idx = Math.floor(frame / 2) % DASH_SEQ.length;
          try { map.setPaintProperty('arc-lines', 'line-dasharray', DASH_SEQ[idx]); } catch { /* ignore */ }
        }

        // 도시 글로우 펄스 (4프레임마다)
        if (frame % 4 === 0) {
          const t = (frame / 4) / 60; // ~1Hz 진동
          const glow = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));
          try { map.setPaintProperty('city-glow', 'circle-opacity', glow); } catch { /* ignore */ }
        }

        frame++;
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── zoomIn phase ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'zoomIn') return;
    const map = mapRef.current;
    if (!map) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    map.flyTo({
      center: [127.5, 37.5],
      zoom: 14,
      speed: 0.9,
      curve: 1.6,
      essential: true,
    });

    const switchTimer = setTimeout(() => {
      try { (map as any).setProjection({ type: 'mercator' }); } catch { /* ignore */ }
    }, 1600);

    const overlayTimer = setTimeout(() => setDarkOverlay(true), 1800);
    const endTimer = setTimeout(() => onAnimationEnd?.(), 2700);

    return () => {
      clearTimeout(switchTimer);
      clearTimeout(overlayTimer);
      clearTimeout(endTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          background: '#000010',
        }}
      />
      {/* 지구 속으로 들어간 뒤 navigate 직전 어둠으로 덮어 깜빡임 방지 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000010',
          opacity: darkOverlay ? 1 : 0,
          transition: 'opacity 0.8s ease-in',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
