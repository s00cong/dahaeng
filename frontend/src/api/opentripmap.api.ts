const API_KEY = '5ae2e3f221c38a28845f05b6b2a9bea6b9a202c08e3b8bbff533d495';
const BASE_URL = 'https://api.opentripmap.com/0.1/en/places';

export type OtmSpot = {
  xid: string;
  name: string;
  dist: number;
  rate: number;
  kinds: string;
  lat: number;
  lon: number;
  imageUrl?: string;
  description?: string;
  url?: string;
  wikipedia?: string;
  wikiVoyage?: string;
  otm?: string;
  addressCity?: string;
};

const KIND_LABEL: Record<string, string> = {
  historic: '역사',
  natural: '자연',
  museums: '박물관',
  architecture: '건축',
  religion: '종교',
  cultural: '문화',
  amusements: '놀이',
  sport: '스포츠',
  gardens: '정원',
  beaches: '해변',
  parks: '공원',
  towers: '타워',
  castles: '성',
  temples: '사원',
  churches: '교회',
  monuments: '기념물',
  interesting_places: '명소',
};

export function getKindLabel(kinds: string): string {
  const list = kinds.split(',').map((k) => k.trim());
  for (const k of list) {
    if (KIND_LABEL[k]) return KIND_LABEL[k];
  }
  return '관광지';
}

type RadiusItem = {
  xid: string;
  name: string;
  dist: number;
  rate: number;
  kinds: string;
  point: { lat: number; lon: number };
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Haversine 거리(미터) — 두 위경도 좌표 사이의 실제 거리 */
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * 100m 이내 중복 제거 (greedy).
 * 비교 대상은 이미 채택된 항목(result)에만 — 릴레이 연쇄 필터링 방지.
 * A→B가 80m라 B를 제거해도, C가 B로부터 80m·A로부터 150m라면 C는 유지됨.
 */
function preDedup(items: RadiusItem[]): RadiusItem[] {
  const result: RadiusItem[] = [];
  for (const item of items) {
    const norm = normalizeName(item.name);
    const isDup =
      result.some(
        (s) => haversineM(s.point.lat, s.point.lon, item.point.lat, item.point.lon) < 100,
      ) ||
      (norm.length > 3 && result.some((s) => normalizeName(s.name) === norm));
    if (!isDup) result.push(item);
  }
  return result;
}

const LANDMARK_KINDS = [
  'monuments',
  'towers',
  'skyscrapers',
  'bridges',
  'historic_architecture',
  'urban_environment',
  'museums',
].join(',');

export const openTripMapApi = {
  getSpots: async (lat: number, lon: number): Promise<OtmSpot[]> => {
    const radiusRes = await fetch(
      `${BASE_URL}/radius?radius=100000&lon=${lon}&lat=${lat}&kinds=${LANDMARK_KINDS}&rate=2&limit=50&format=json&apikey=${API_KEY}`,
    );
    const radiusData: RadiusItem[] = await radiusRes.json();
    const items = radiusData.filter((p) => p.xid && p.point);

    if (!items.length) return [];

    const candidates = preDedup(items).slice(0, 12);

    const details: OtmSpot[] = [];
    for (const { xid, dist, rate, point } of candidates) {
      try {
        const res = await fetch(`${BASE_URL}/xid/${xid}?apikey=${API_KEY}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d: any = await res.json();

        if (d.error) continue;

        const imageUrl: string | undefined = d.preview?.source ?? undefined;
        const name: string = d.name ?? '';
        if (!name || !imageUrl) continue;

        const addrCity = d.address?.city ?? d.address?.town ?? d.address?.village;
        const addrCountry = d.address?.country?.replace(/\s*\(.*?\)/, '').trim();
        const addressCity = addrCity && addrCountry ? `${addrCity}, ${addrCountry}` : undefined;

        details.push({
          xid: d.xid ?? xid,
          name,
          dist,
          rate,
          kinds: d.kinds ?? '',
          lat: d.point?.lat ?? point.lat,
          lon: d.point?.lon ?? point.lon,
          imageUrl,
          description: d.wikipedia_extracts?.text ?? undefined,
          url: d.url ?? undefined,
          wikipedia: d.wikipedia ?? undefined,
          wikiVoyage: d.wikiVoyage ?? undefined,
          otm: d.otm ?? undefined,
          addressCity,
        });

        await new Promise((r) => setTimeout(r, 200));
      } catch {
        continue;
      }
    }

    return details;
  },
};
