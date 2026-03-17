import { create } from 'zustand';

interface PreferenceState {
  budget: number | null;
  duration: number | null;
  selectedTags: string[];
  riskSensitivity: number;
  youtubeAutoSelected: boolean;
  youtubeTagIds: number[];

  setBudget: (v: number) => void;
  setDuration: (v: number) => void;
  toggleTag: (tag: string) => void;
  setRiskSensitivity: (v: number) => void;
  setYoutubeAutoSelected: (v: boolean) => void;
  setYoutubeTagIds: (ids: number[]) => void;
  reset: () => void;
}

const initialState = {
  budget: null,
  duration: null,
  selectedTags: [] as string[],
  riskSensitivity: 3,
  youtubeAutoSelected: false,
  youtubeTagIds: [] as number[],
};

export const usePreferenceStore = create<PreferenceState>((set, get) => ({
  ...initialState,
  setBudget: (v) => set({ budget: v }),
  setDuration: (v) => set({ duration: v }),
  toggleTag: (tag) => {
    const tags = get().selectedTags;
    set({
      selectedTags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
    });
  },
  setRiskSensitivity: (v) => set({ riskSensitivity: v }),
  setYoutubeAutoSelected: (v) => set({ youtubeAutoSelected: v }),
  setYoutubeTagIds: (ids) => set({ youtubeTagIds: ids }),
  reset: () => set(initialState),
}));
