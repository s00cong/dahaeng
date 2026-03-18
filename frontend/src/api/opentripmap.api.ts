const API_KEY = '5ae2e3f221c38a28845f05b6b2a9bea6b9a202c08e3b8bbff533d495';
const BASE_URL = 'https://api.opentripmap.com/0.1/en/places';

export type OtmSpot = {
  xid: string;
  name: string;
  dist: number;
  rate: number;       // 인기도 1-3 (radius API 기준)
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

// 이름 정규화
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}


// radius 결과에서 1km 내 중복 제거 (lat/lon 이미 있음)
function preDedup(items: RadiusItem[]): RadiusItem[] {
  const result: RadiusItem[] = [];
  for (const item of items) {
    const norm = normalizeName(item.name);
    const isDup =
      result.some(
        (s) =>
          Math.abs(s.point.lat - item.point.lat) < 0.009 &&
          Math.abs(s.point.lon - item.point.lon) < 0.009,
      ) ||
      (norm.length > 3 && result.some((s) => normalizeName(s.name) === norm));
    if (!isDup) result.push(item);
  }
  return result;
}

export const openTripMapApi = {
  getSpots: async (lat: number, lon: number): Promise<OtmSpot[]> => {
    // 1단계: rate=3(최고 등급)만, 반경 50km, 50개 목록 — lat/lon/name/kinds 포함
    const radiusRes = await fetch(
      `${BASE_URL}/radius?radius=50000&lon=${lon}&lat=${lat}&kinds=interesting_places&rate=3&limit=50&format=json&apikey=${API_KEY}`,
    );
    const radiusData: RadiusItem[] = await radiusRes.json();
    const items = radiusData.filter((p) => p.xid && p.point);

    if (!items.length) return [];

    // 2단계: radius 응답만으로 1km 내 중복 제거 → 상위 12개만 xid 조회 대상으로
    const candidates = preDedup(items).slice(0, 12);

    // 3단계: 선별된 12개만 상세 조회 (이미지·설명·링크 획득)
    const details = await Promise.all(
      candidates.map(async ({ xid, dist, rate: radiusRate, point }) => {
        try {
          const res = await fetch(`${BASE_URL}/xid/${xid}?apikey=${API_KEY}`);
          const d = await res.json();

          const addrCity = d.address?.city ?? d.address?.town ?? d.address?.village;
          const addrCountry = d.address?.country?.replace(/\s*\(.*?\)/, '').trim();
          const addressCity =
            addrCity && addrCountry ? `${addrCity}, ${addrCountry}` : undefined;

          return {
            xid: d.xid ?? xid,
            name: d.name ?? '',
            dist,
            rate: radiusRate,
            kinds: d.kinds ?? '',
            lat: d.point?.lat ?? point.lat,
            lon: d.point?.lon ?? point.lon,
            imageUrl: d.preview?.source ?? undefined,
            description: d.wikipedia_extracts?.text ?? undefined,
            url: d.url ?? undefined,
            wikipedia: d.wikipedia ?? undefined,
            wikiVoyage: d.wikiVoyage ?? undefined,
            otm: d.otm ?? undefined,
            addressCity,
          } as OtmSpot;
        } catch {
          return null;
        }
      }),
    );

    // 사진 있는 곳만 → 상위 6개
    return details
      .filter((d): d is OtmSpot => d !== null && !!d.name && !!d.imageUrl)
      .slice(0, 6);
  },
};
