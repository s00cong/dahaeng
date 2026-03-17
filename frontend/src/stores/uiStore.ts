import { create } from "zustand";

export type RecommendResultItem = {
  rank: number;
  country: string;
  city: string;
  totalScore: number;
  reason: string | null | undefined;
};

type CityDetailTab = "recommend" | "cost" | "flight" | "spots";

interface UiState {
  // 선택된 도시 (RightPanel + CityDetailModal 공유)
  selectedCityId: number | null;
  selectedCityImgUrl: string | null;
  selectedCityCoords: { lat: number; lng: number } | null;

  // 우측 요약 패널
  isRightPanelOpen: boolean;

  // 추천 상태
  isRecommendActive: boolean;

  recommendResults: RecommendResultItem[];

  // 도시 상세 모달 (전체 화면)
  isCityModalOpen: boolean;
  activeCityTab: CityDetailTab;

  // 글로브 필터
  globeBudgetFilter: [number, number];
  globeDuration: number;
  globeTravelYear: number;
  globeTravelMonth: number;

  // 액션
  openRightPanel: (
    cityId: number,
    imgUrl?: string,
    coords?: { lat: number; lng: number },
  ) => void;
  closeRightPanel: () => void;
  openCityModal: (tab?: CityDetailTab) => void;
  closeCityModal: () => void;
  setActiveCityTab: (tab: CityDetailTab) => void;
  setGlobeBudgetFilter: (range: [number, number]) => void;
  setGlobeDuration: (days: number) => void;
  setGlobeTravelMonth: (year: number, month: number) => void;
  setRecommendActive: (v: boolean) => void;
  setRecommendResults: (results: RecommendResultItem[]) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedCityId: null,
  selectedCityImgUrl: null,
  selectedCityCoords: null,
  isRightPanelOpen: false,
  isCityModalOpen: false,
  activeCityTab: "recommend",
  globeBudgetFilter: [0, 5_000_000],

  openRightPanel: (cityId, imgUrl, coords) =>
    set({
      selectedCityId: cityId,
      selectedCityImgUrl: imgUrl ?? null,
      selectedCityCoords: coords ?? null,
      isRightPanelOpen: true,
      isCityModalOpen: false,
    }),
  closeRightPanel: () => set({ isRightPanelOpen: false }),
  openCityModal: (tab = "recommend") =>
    set({ isCityModalOpen: true, activeCityTab: tab }),
  closeCityModal: () =>
    set({ isCityModalOpen: false, activeCityTab: "recommend" }),
  setActiveCityTab: (tab) => set({ activeCityTab: tab }),
  globeDuration: 2,
  globeTravelYear: new Date().getFullYear(),
  globeTravelMonth: new Date().getMonth() + 1,
  setGlobeBudgetFilter: (range) => set({ globeBudgetFilter: range }),
  setGlobeDuration: (days) => set({ globeDuration: days }),
  setGlobeTravelMonth: (year, month) =>
    set({ globeTravelYear: year, globeTravelMonth: month }),
  isRecommendActive: false,
  recommendResults: [],
  setRecommendActive: (v) => set({ isRecommendActive: v }),
  setRecommendResults: (results) => set({ recommendResults: results }),
}));
