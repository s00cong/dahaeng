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

export const nearbyAttractionsApi = {
  getNearbyAttractions: async (cityId: number): Promise<NearbyAttractionFeature[]> => {
    try {
      const { data } = await axiosInstance.get<NearbyAttractionsGeoJSON>(`/api/${cityId}/nearby-attractions`);
      return data?.features ?? [];
    } catch {
      return [];
    }
  },
};
