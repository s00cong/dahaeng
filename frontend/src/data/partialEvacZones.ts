// 철수권고(일부) 구역 — 위험도 토글 시 해당 지역만 빨간색 오버레이
// 좌표는 대략적 근사값

// 유기적인 블롭 폴리곤 — 여러 사인파 고조파로 자연스러운 윤곽 생성
function organicBlob(
  cx: number, cy: number, // 중심 (경도, 위도)
  rx: number, ry: number, // 반경
  seed = 0,
  steps = 60,
): GeoJSON.Polygon {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r =
      1 +
      0.13 * Math.sin(2 * a + seed) +
      0.09 * Math.sin(3 * a + seed * 1.6) +
      0.06 * Math.sin(5 * a + seed * 2.4) +
      0.03 * Math.sin(7 * a + seed * 0.9);
    pts.push([cx + rx * r * Math.cos(a), cy + ry * r * Math.sin(a)]);
  }
  pts[pts.length - 1] = pts[0];
  return { type: "Polygon", coordinates: [pts] };
}

function box(w: number, s: number, e: number, n: number, seed = 0): GeoJSON.Polygon {
  return organicBlob((w + e) / 2, (s + n) / 2, (e - w) / 2, (n - s) / 2, seed);
}

function multiBox(...rects: [number, number, number, number][]): GeoJSON.MultiPolygon {
  return {
    type: "MultiPolygon",
    coordinates: rects.map(([w, s, e, n], i) =>
      organicBlob((w + e) / 2, (s + n) / 2, (e - w) / 2, (n - s) / 2, i * 1.3).coordinates,
    ),
  };
}

function approxCircle(lng: number, lat: number, rDeg: number, steps = 48): GeoJSON.Polygon {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    coords.push([lng + rDeg * Math.cos(a), lat + rDeg * Math.sin(a)]);
  }
  return { type: "Polygon", coordinates: [coords] };
}

export interface EvacZone {
  country: string;
  description: string;
  geometry: GeoJSON.Geometry;
}

// 철수권고(일부) 색상 — 전체 철수권고 나라와 동일한 빨간색
export const EVAC_COLOR = "#dc2626";

export const PARTIAL_EVAC_ZONES: EvacZone[] = [
  // Japan — 후쿠시마 원전 반경 30km (37.42°N, 141.03°E)
  {
    country: "Japan",
    description: "후쿠시마 원전 반경 30km 이내",
    geometry: approxCircle(141.03, 37.42, 0.28),
  },

  // India — 카슈미르, 카르길
  {
    country: "India",
    description: "카슈미르, 카르길 시",
    geometry: box(74.0, 33.0, 78.5, 36.0, 1.1),
  },

  // Cambodia — 시하누크빌 주, 태국 국경 50km
  {
    country: "Cambodia",
    description: "시하누크빌 주, 캄보디아-태국 국경 50km 이내",
    geometry: multiBox(
      [102.8, 10.0, 104.5, 11.5],
      [102.0, 13.0, 107.5, 14.5],
    ),
  },

  // Egypt — 북·중부 시나이, 리비아 국경 30km
  {
    country: "Egypt",
    description: "중·북부 시나이 반도, 리비아 국경 30km",
    geometry: multiBox(
      [ 32.0, 29.5,  34.5, 31.5],
      [ 24.7, 21.5,  25.3, 31.5],
    ),
  },

  // Kenya — 북동부 6개 주 + 접경
  {
    country: "Kenya",
    description: "만데라·와지르·가리사·라무·타나강·킬리피 주 일부, 에티오피아·남수단 접경",
    geometry: multiBox(
      [38.5, -1.5, 42.5,  4.2],
      [33.5,  3.8, 36.5,  5.0],
    ),
  },

  // Malaysia — 사바주 동부
  {
    country: "Malaysia",
    description: "사바주 동부도서 지역 및 동부해안",
    geometry: box(117.0, 4.0, 119.5, 7.5, 2.5),
  },

  // Mexico — 치아파스주, 시날로아주
  {
    country: "Mexico",
    description: "치아파스주, 시날로아주",
    geometry: multiBox(
      [-94.5, 14.0, -90.0, 17.8],
      [-109.5, 22.0, -105.0, 27.2],
    ),
  },

  // Morocco — 서사하라 모래방어벽 동쪽
  {
    country: "Morocco",
    description: "서사하라 내 모래방어벽 동쪽",
    geometry: box(-12.5, 20.5, -8.5, 27.5, 3.7),
  },

  // Peru — VRAEM 지역
  {
    country: "Peru",
    description: "아야쿠초·우앙카벨리카·쿠스코·후닌 주 일부 (VRAEM)",
    geometry: multiBox(
      [-75.5, -15.0, -73.0, -11.5],
      [-74.0, -13.5, -71.5, -11.0],
      [-75.0, -12.5, -73.5, -10.5],
    ),
  },

  // Philippines — 팔라완 남부, 민다나오 일부
  {
    country: "Philippines",
    description: "팔라완 남부 (아볼란 이남), 민다나오섬 일부",
    geometry: multiBox(
      [117.5,  8.0, 119.5, 11.0],
      [121.5,  5.5, 126.0,  8.5],
    ),
  },

  // Russia — 북카프카즈, 우크라이나 접경
  {
    country: "Russia",
    description: "북카프카즈 지역, 우크라이나 접경 지역",
    geometry: multiBox(
      [37.0, 42.5, 50.0, 46.0],
      [31.5, 47.0, 41.0, 52.5],
    ),
  },

  // Thailand — 남부 4개 주, 캄보디아 국경 50km
  {
    country: "Thailand",
    description: "송클라 남부·파타니·나라티왓·얄라 주, 태국-캄보디아 국경 50km",
    geometry: multiBox(
      [100.0,  5.5, 102.5,  7.2],
      [102.0, 12.5, 105.5, 14.5],
    ),
  },

  // Turkey — 동남부 5개 주, 시리아 국경
  {
    country: "Turkey",
    description: "빙괼·바트만·시이르트·시르나크·하카리 주, 시리아 국경 10km",
    geometry: box(38.5, 36.5, 44.5, 39.0, 4.9),
  },
];
