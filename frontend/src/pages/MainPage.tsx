import { useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { CityDetailModal } from "@/components/city/CityDetailModal";
import { LeftSidebar } from "@/components/main/LeftSidebar";
import { GlobeContainer } from "@/components/globe/GlobeContainer";
import { RightPanel } from "@/components/main/RightPanel";
import { youtubeApi } from "@/api/youtube.api";
import { authApi } from "@/api/auth.api";
import { tagApi } from "@/api/tag.api";
import { usePreferenceStore } from "@/stores/preferenceStore";

const MainPage = () => {
  // Activates TanStack Router search param subscription for this route
  useSearch({ from: "/_authenticated/main" });

  // 메인 진입 시 유저 관심 태그 로드 → selectedTags 초기화
  // 우선순위: DB 저장 태그 → YouTube 관심 태그
  const { selectedTags, setSelectedTags } = usePreferenceStore();
  useEffect(() => {
    if (selectedTags.length > 0) return;
    Promise.all([authApi.getMemberTags(), tagApi.getList()])
      .then(([memberTags, tagList]) => {
        const savedTagIds = memberTags.map((t) => t.tagId);
        const tagNames = tagList
          .filter((t) => savedTagIds.includes(t.tagId))
          .map((t) => t.tagName);
        if (tagNames.length > 0) {
          setSelectedTags(tagNames);
          return;
        }
        // DB 태그 없으면 YouTube 관심 태그로 폴백
        return youtubeApi.getInterestTags().then(({ tagNames: ytNames }) => {
          if (ytNames.length > 0) setSelectedTags(ytNames);
        });
      })
      .catch(() => {});
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
      {/* Background — 지도 배경색과 동일하게 */}
      <div className="absolute inset-0" style={{ background: "#0d1b2e" }} aria-hidden="true" />

      {/* Left Sidebar — absolute overlay */}
      <LeftSidebar />

      {globeReady ? (
        <GlobeContainer className="absolute inset-0" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-blue-400" />
          <p className="text-sm text-white/50">지도를 불러오는 중...</p>
        </div>
      )}

      {/* Right Summary Panel — 마커/카드 클릭 시 슬라이드 인 */}
      <RightPanel />

      {/* City Detail Modal — 전체 화면, 상세 보기 버튼으로 진입 */}
      <CityDetailModal />
    </div>
  );
};

export default MainPage;
