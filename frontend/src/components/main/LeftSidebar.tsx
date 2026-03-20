import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TripSettingsPanel } from "./TripSettingsPanel";
import { TopMatchingList } from "./TopMatchingList";
import { useUiStore } from "@/stores/uiStore";

// 패널 폭 256px (w-64), 탭 24px, 간격 8px
const PANEL_W = 256;
const TAB_W = 24;
const GAP = 8;

export function LeftSidebar() {
  const { isLeftSidebarCollapsed, toggleLeftSidebar } = useUiStore();

  return (
    <motion.aside
      className="absolute z-20 top-[72px] bottom-3 flex flex-row items-start"
      style={{ left: 0 }}
      animate={{ x: isLeftSidebarCollapsed ? -(PANEL_W + GAP) : 12 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      aria-label="여행 설정 사이드바"
    >
      {/* 패널 콘텐츠 */}
      <div className="w-64 flex flex-col gap-3 h-full">
        <TripSettingsPanel />
        <TopMatchingList />
      </div>

      {/* 탭 핸들 — 접혔을 때 화면 왼쪽 가장자리에 살짝 보임 */}
      <button
        onClick={toggleLeftSidebar}
        className="mt-24 flex flex-col items-center justify-center py-3
                   rounded-r-xl bg-white/90 backdrop-blur-md shadow-lg
                   text-slate-500 hover:text-slate-700 hover:bg-white
                   transition-colors focus:outline-none"
        style={{ width: TAB_W, marginLeft: GAP }}
        aria-label={isLeftSidebarCollapsed ? "사이드바 열기" : "사이드바 닫기"}
      >
        {isLeftSidebarCollapsed
          ? <ChevronRight className="size-3.5" />
          : <ChevronLeft className="size-3.5" />
        }
      </button>
    </motion.aside>
  );
}
