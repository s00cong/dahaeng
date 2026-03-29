import { axiosInstance } from './axiosInstance';

export type PlaceTag = {
  tagName: string;
  score: number;
};

export type Place = {
  id: number;
  name: string;
  koName: string | null;
  address: string | null;
  socialUrl: string | null;
  websiteUrl: string | null;
  lat: number | null;
  lon: number | null;
  tags: PlaceTag[];
};

export const placesApi = {
  // GET /api/{cityId}/places — Authorization 헤더 있으면 사용자 태그 기반 정렬
  getPlaces: async (cityId: number): Promise<Place[]> => {
    const { data } = await axiosInstance.get(`/api/${cityId}/places`);
    return data as Place[];
  },
};
