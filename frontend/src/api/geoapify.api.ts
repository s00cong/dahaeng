const API_KEY = '10d1cd3433ba4e4794f51d679d89a3fe';
const BASE_URL = 'https://api.geoapify.com/v2/places';

export type GeoapifySpot = {
  placeId: string;
  name: string;        // 현지 이름 (원어)
  nameKo?: string;     // 한국어 이름
  nameEn?: string;     // 영어 이름 (name_international.en)
  categories: string[];
  categoryLabel: string;
  description?: string;
  city?: string;
  country?: string;
  lat: number;
  lon: number;
  website?: string;
  openingHours?: string;
  isFree?: boolean;
  facilities?: {
    wheelchair?: boolean;
    smoking?: boolean;
    dogs?: boolean;
    internetAccess?: boolean;
  };
  wikipedia?: string;
  imageUrl?: string;
  historic?: { type?: string; startDate?: number };
  building?: { architecture?: string; height?: number; levels?: number };
  heritage?: { level?: number; operator?: string };
};

// parseFeature 내부용 (이미지 조회에 필요한 임시 필드 포함)
type RawSpot = GeoapifySpot & { _wikiTitle?: string };

const CATEGORY_LABELS: [string, string][] = [
  ['entertainment.museum', '박물관'],
  ['tourism.sights.bridge', '다리'],
  ['tourism.sights.castle', '성'],
  ['tourism.sights.fort', '요새'],
  ['tourism.sights.tower', '타워'],
  ['building.historic', '역사건물'],
  ['heritage', '문화유산'],
  ['leisure.park', '공원'],
  ['tourism.attraction', '관광지'],
  ['tourism.sights', '명소'],
];

function getCategoryLabel(categories: string[]): string {
  for (const [cat, label] of CATEGORY_LABELS) {
    if (categories.includes(cat)) return label;
  }
  return '명소';
}

// ── 이미지 추출 폭포수 전략 ──────────────────────────────────────────────────
//
// 1a. wiki_and_media.image 가 upload.wikimedia.org URL → 직접 사용
// 1b. wiki_and_media.image 가 en.wikipedia.org/wiki/File:... → 파일명 추출 후 Special:FilePath
// 2.  wikimedia_commons 가 File:... → Special:FilePath
// 3.  wikipedia 제목 → Wikipedia REST API thumbnail.source
// 4.  wikidata Q코드만 / 없음 → undefined

function filenameToSpecialPath(filename: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename.replace(/ /g, '_'))}?width=500`;
}

/** wiki_and_media.image 필드에서 이미지 URL 추출 */
function resolveImageField(image: string): string | undefined {
  if (!image) return undefined;
  // 1a: upload.wikimedia.org 직접 URL
  if (image.startsWith('https://upload.wikimedia.org/') || image.startsWith('http://upload.wikimedia.org/')) {
    return image;
  }
  // 1b: en.wikipedia.org/wiki/File:Foo.jpg → 파일명만 추출
  const fileMatch = image.match(/\/wiki\/File:(.+)$/i);
  if (fileMatch) {
    return filenameToSpecialPath(decodeURIComponent(fileMatch[1]));
  }
  return undefined;
}

/** wikimedia_commons 필드에서 이미지 URL 추출 (File: 케이스만) */
function resolveCommonsField(commons: string): string | undefined {
  if (!commons.startsWith('File:')) return undefined;
  return filenameToSpecialPath(commons.slice(5));
}

async function fetchWikipediaThumbnail(wikiTitle: string): Promise<string | undefined> {
  // "en:Rockefeller Center" → lang="en", title="Rockefeller_Center"
  // "ja:札幌市" → lang="ja", title="札幌市"
  const match = wikiTitle.match(/^([a-z]+):(.+)$/);
  const lang = match ? match[1] : 'en';
  const rawTitle = match ? match[2] : wikiTitle;
  const title = rawTitle.replace(/ /g, '_');

  try {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    return data.thumbnail?.source ?? data.originalimage?.source ?? undefined;
  } catch {
    return undefined;
  }
}

// ── feature 파싱 ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFeature(f: any): RawSpot | null {
  const p = f.properties;
  if (!p?.name) return null;

  const categories: string[] = p.categories ?? [];
  const isFree = categories.some((c: string) => c.startsWith('no_fee'));

  const wm = p.wiki_and_media ?? {};
  const imageField = wm.image as string | undefined;
  const wikimediaCommons = wm.wikimedia_commons as string | undefined;
  const wikiPage = wm.wikipedia as string | undefined;

  // 1a/1b: wiki_and_media.image 필드
  const imageFromField = imageField ? resolveImageField(imageField) : undefined;
  // 2: wikimedia_commons File: 변환
  const imageFromCommons = !imageFromField && wikimediaCommons ? resolveCommonsField(wikimediaCommons) : undefined;
  // 즉시 결정된 이미지
  const staticImageUrl = imageFromField ?? imageFromCommons;

  // 3순위: wikipedia 제목으로 나중에 비동기 조회
  const _wikiTitle = !staticImageUrl && wikiPage ? wikiPage : undefined;

  const wikipedia = wikiPage
    ? `https://en.wikipedia.org/wiki/${wikiPage.replace(/^[a-z]+:/, '').replace(/ /g, '_')}`
    : undefined;

  return {
    placeId: p.place_id as string,
    name: p.name as string,
    nameKo: (p.name_international?.ko as string) ?? undefined,
    nameEn: (p.name_international?.en as string) ?? undefined,
    categories,
    categoryLabel: getCategoryLabel(categories),
    description: (p.description as string) ?? undefined,
    city: (p.city as string) ?? undefined,
    country: (p.country as string) ?? undefined,
    lat: f.geometry.coordinates[1] as number,
    lon: f.geometry.coordinates[0] as number,
    website: (p.website as string) ?? undefined,
    openingHours: (p.opening_hours as string) ?? undefined,
    isFree,
    facilities: p.facilities
      ? {
          wheelchair: p.facilities.wheelchair as boolean | undefined,
          smoking: p.facilities.smoking as boolean | undefined,
          dogs: p.facilities.dogs as boolean | undefined,
          internetAccess: p.facilities.internet_access as boolean | undefined,
        }
      : undefined,
    wikipedia,
    imageUrl: staticImageUrl,  // 1a/1b/2 케이스는 여기서 즉시 채워짐
    historic: p.historic
      ? { type: p.historic.type, startDate: p.historic.start_date }
      : undefined,
    building: p.building
      ? { architecture: p.building.architecture, height: p.building.height, levels: p.building.levels }
      : undefined,
    heritage: p.heritage
      ? { level: p.heritage.level, operator: p.heritage.operator }
      : undefined,
    _wikiTitle,
  };
}

// ── 공개 API ─────────────────────────────────────────────────────────────────

export const geoapifyApi = {
  getSpots: async (lat: number, lon: number, radius = 10000): Promise<GeoapifySpot[]> => {
    const LANDMARK_CATEGORIES = [
      // 핵심 랜드마크
      'tourism.sights.castle',
      'tourism.sights.tower',
      'tourism.sights.bridge',
      'tourism.sights.fort',
      'tourism.sights.lighthouse',
      'tourism.sights.archaeological_site',
      'tourism.sights.monastery',
      'tourism.sights.memorial.monument',
      'tourism.sights.ruines',
      'tourism.sights.place_of_worship.cathedral',
      'tourism.attraction',
      // 있으면 좋은 것
      'tourism.sights.city_gate',
      'tourism.sights.place_of_worship.temple',
      'tourism.sights.place_of_worship.shrine',
      'tourism.sights.battlefield',
      // 문화/자연
      'heritage',
      'heritage.unesco',
      'entertainment.museum',
      'entertainment.aquarium',
      'entertainment.zoo',
      'leisure.park',
    ].join(',');

    const url =
      `${BASE_URL}?categories=${LANDMARK_CATEGORIES}` +
      `&filter=circle:${lon},${lat},${radius}` +
      `&limit=20&apiKey=${API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    if (!Array.isArray(data.features)) return [];

    // 1단계: 모든 feature 파싱
    const rawSpots: RawSpot[] = data.features
      .map(parseFeature)
      .filter((s: RawSpot | null): s is RawSpot => s !== null);

    // 2단계: wikipedia 제목이 있는 spot들 병렬로 썸네일 조회
    const needsWiki = rawSpots.filter((s) => !s.imageUrl && s._wikiTitle);
    await Promise.allSettled(
      needsWiki.map(async (spot) => {
        const thumb = await fetchWikipediaThumbnail(spot._wikiTitle!);
        if (thumb) spot.imageUrl = thumb;
      }),
    );

    // 3단계: 카테고리 접두사별 쿼터 적용
    const QUOTA_PREFIX: [string, number][] = [
      ['entertainment.museum', 1],
      ['entertainment.culture', 2],
      ['religion.place_of_worship', 2],
      ['tourism.sights.place_of_worship', 2],
      ['leisure.park', 2],
      ['tourism.sights.memorial', 2],
    ];
    const counts: Record<string, number> = {};
    const quotaFiltered = rawSpots.filter((spot) => {
      for (const [prefix, max] of QUOTA_PREFIX) {
        const matched = spot.categories.some((c) => c === prefix || c.startsWith(prefix + '.'));
        if (matched) {
          counts[prefix] = (counts[prefix] ?? 0) + 1;
          if (counts[prefix] > max) return false;
        }
      }
      return true;
    });

    // 4단계: 이미지 없는 카드 제거 후 내부 필드 제거
    return quotaFiltered
      .filter((s) => !!s.imageUrl)
      .map(({ _wikiTitle: _, ...rest }) => rest);
  },
};
