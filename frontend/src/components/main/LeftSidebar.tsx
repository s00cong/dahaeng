import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TripSettingsPanel } from "./TripSettingsPanel";
import { TopMatchingList } from "./TopMatchingList";
import { useUiStore } from "@/stores/uiStore";

const TAB_W = 24;
const GAP = 8;

export function LeftSidebar() {
  const { isLeftSidebarCollapsed, toggleLeftSidebar } = useUiStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState(256);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setPanelWidth(el.getBoundingClientRect().width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.aside
      className="absolute z-20 top-[72px] bottom-3 flex flex-row items-start"
      style={{ left: 0 }}
      animate={{ x: isLeftSidebarCollapsed ? -(panelWidth + GAP) : 12 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      aria-label="여행 설정 사이드바"
    >
      {/* 패널 콘텐츠 */}
      <div ref={panelRef} className="w-52 md:w-56 lg:w-64 flex flex-col gap-3 h-full">
        <TripSettingsPanel />
        <TopMatchingList />
      </div>

      {/* 탭 핸들 */}
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
