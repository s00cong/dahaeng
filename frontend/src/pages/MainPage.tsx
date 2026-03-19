import { useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CityDetailModal } from "@/components/city/CityDetailModal";
import { LeftSidebar } from "@/components/main/LeftSidebar";
import { GlobeContainer } from "@/components/globe/GlobeContainer";
import { RightPanel } from "@/components/main/RightPanel";
import { youtubeApi } from "@/api/youtube.api";
import { usePreferenceStore } from "@/stores/preferenceStore";

const MainPage = () => {
  // Activates TanStack Router search param subscription for this route
  useSearch({ from: "/_authenticated/main" });

  // 메인 진입 시 유저 관심 태그 로드 → selectedTags 초기화
  const { selectedTags, setSelectedTags } = usePreferenceStore();
  useEffect(() => {
    if (selectedTags.length === 0) {
      youtubeApi.getInterestTags()
        .then(({ tagNames }) => {
          if (tagNames.length > 0) setSelectedTags(tagNames);
        })
        .catch(() => {});
    }
  }, []);

  // navbar 애니메이션(0.4s)이 끝난 뒤 Globe를 마운트해 JS 스레드 경합 방지
  const [globeReady, setGlobeReady] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setGlobeReady(true), 450);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden"
      role="main"
      aria-label="다행 메인 페이지"
    >
      {/* Background image */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #93C5FD 0%, #93C5FD 100%)",
        }}
        aria-hidden="true"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/1" aria-hidden="true" />

      {/* Left Sidebar — absolute overlay */}
      <LeftSidebar />

      {globeReady && <GlobeContainer className="absolute inset-0" />}

      {/* Right Summary Panel — 마커/카드 클릭 시 슬라이드 인 */}
      <RightPanel />

      {/* City Detail Modal — 전체 화면, 상세 보기 버튼으로 진입 */}
      <CityDetailModal />
    </div>
  );
};

export default MainPage;
