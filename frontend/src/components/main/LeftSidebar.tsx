import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CircleHelp } from "lucide-react";
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

      {/* 탭 핸들 + 튜토리얼 버튼 */}
      <div className="flex flex-col items-center gap-2" style={{ marginLeft: GAP }}>
        {/* 튜토리얼 트리거 */}
        <div className="relative group">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("dahaeng:open-tutorial"))}
            className="flex items-center justify-center size-6 rounded-full
                       bg-white/90 backdrop-blur-md shadow-lg
                       text-slate-400 hover:text-blue-500 hover:bg-white
                       transition-colors focus:outline-none"
            aria-label="튜토리얼 열기"
          >
            <CircleHelp className="size-4" />
          </button>
          <span className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2
                           whitespace-nowrap rounded-md bg-slate-800 px-2 py-1
                           text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
            튜토리얼
          </span>
        </div>

        {/* 접기/펼치기 핸들 */}
        <button
          onClick={toggleLeftSidebar}
          className="mt-20 flex flex-col items-center justify-center py-3
                     rounded-r-xl bg-white/90 backdrop-blur-md shadow-lg
                     text-slate-500 hover:text-slate-700 hover:bg-white
                     transition-colors focus:outline-none"
          style={{ width: TAB_W }}
          aria-label={isLeftSidebarCollapsed ? "사이드바 열기" : "사이드바 닫기"}
        >
          {isLeftSidebarCollapsed
            ? <ChevronRight className="size-3.5" />
            : <ChevronLeft className="size-3.5" />
          }
        </button>
      </div>
    </motion.aside>
  );
}
