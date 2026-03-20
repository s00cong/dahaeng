import { axiosInstance } from './axiosInstance';

export type NearbyAttractionProperties = {
  name: string;
  categories: string[] | null;
  website: string | null;
  opening_hours: string | null;
  description: string | null;
  facilities: {
    wheelchair?: string | null;
    internet_access?: string | null;
  } | null;
  wiki_and_media: {
    wikipedia?: string | null;
    image?: string | null;
  } | null;
  contact: {
    phone?: string | null;
    email?: string | null;
  } | null;
  lon: number;
  lat: number;
  formatted: string | null;
  imageUrl?: string;
};

export type NearbyAttractionFeature = {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: NearbyAttractionProperties;
};

export type NearbyAttractionsGeoJSON = {
  type: 'FeatureCollection';
  features: NearbyAttractionFeature[];
};

// ── 이미지 해석 유틸 (geoapify.api.ts와 동일한 전략) ────────────────────────

function filenameToSpecialPath(filename: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename.replace(/ /g, '_'))}?width=500`;
}

function resolveImageField(image: string): string | undefined {
  if (!image) return undefined;
  if (image.startsWith('https://upload.wikimedia.org/') || image.startsWith('http://upload.wikimedia.org/')) {
    return image;
  }
  const fileMatch = image.match(/\/wiki\/File:(.+)$/i);
  if (fileMatch) {
    return filenameToSpecialPath(decodeURIComponent(fileMatch[1]));
  }
  return undefined;
}

async function fetchWikipediaThumbnail(wikiTitle: string): Promise<string | undefined> {
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

export const nearbyAttractionsApi = {
  getNearbyAttractions: async (cityId: number): Promise<NearbyAttractionFeature[]> => {
    try {
      const { data } = await axiosInstance.get<NearbyAttractionsGeoJSON>(`/api/${cityId}/nearby-attractions`);
      const features = data?.features ?? [];

      // 이미지 해석: wiki_and_media.image → resolveImageField, wikipedia → fetchWikipediaThumbnail
      await Promise.allSettled(
        features.map(async (feature) => {
          const wm = feature.properties.wiki_and_media;
          if (!wm) return;
          const imageField = wm.image ?? undefined;
          const wikiTitle = wm.wikipedia ?? undefined;

          if (imageField) {
            const resolved = resolveImageField(imageField);
            if (resolved) { feature.properties.imageUrl = resolved; return; }
          }
          if (wikiTitle) {
            const thumb = await fetchWikipediaThumbnail(wikiTitle);
            if (thumb) feature.properties.imageUrl = thumb;
          }
        }),
      );

      return features;
    } catch {
      return [];
    }
  },
};
