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
  selectedCityScore: number | null;

  // 우측 요약 패널
  isRightPanelOpen: boolean;

  // 추천 상태
  isRecommendActive: boolean;
  isRecommendLoading: boolean;

  recommendResults: RecommendResultItem[];
  recommendRequest: {
    selectedTags: string[];
    userDailyBudget: number;
    travelDays: number;
    month: number;
  } | null;

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
  setRecommendLoading: (v: boolean) => void;
  setRecommendResults: (results: RecommendResultItem[]) => void;
  setRecommendRequest: (req: { selectedTags: string[]; userDailyBudget: number; travelDays: number; month: number }) => void;
  setSelectedCityScore: (score: number | null) => void;

  // 나라 검색 → 글로브 카메라 이동 트리거 (영어 나라명)
  globeCountryTarget: string | null;
  setGlobeCountryTarget: (name: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedCityId: null,
  selectedCityImgUrl: null,
  selectedCityCoords: null,
  selectedCityScore: null,
  isRightPanelOpen: false,
  isCityModalOpen: false,
  activeCityTab: "recommend",
  globeBudgetFilter: [0, 5_000_000],

  openRightPanel: (cityId, imgUrl, coords) =>
    set({
      selectedCityId: cityId,
      selectedCityImgUrl: imgUrl ?? null,
      selectedCityCoords: coords ?? null,
      selectedCityScore: null,
      isRightPanelOpen: true,
      isCityModalOpen: false,
    }),
  closeRightPanel: () => set({ isRightPanelOpen: false, selectedCityScore: null }),
  setSelectedCityScore: (score) => set({ selectedCityScore: score }),
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
  isRecommendLoading: false,
  recommendResults: [],
  recommendRequest: null,
  setRecommendActive: (v) => set({ isRecommendActive: v }),
  setRecommendLoading: (v) => set({ isRecommendLoading: v }),
  setRecommendResults: (results) => set({ recommendResults: results }),
  setRecommendRequest: (req) => set({ recommendRequest: req }),
  globeCountryTarget: null,
  setGlobeCountryTarget: (name) => set({ globeCountryTarget: name }),
}));
