import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  ChevronRight,
  MapPin,
  SlidersHorizontal,
  Trophy,
  PanelRight,
} from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useCityList } from "@/hooks/city/useCityList";

const TUTORIAL_KEY = "dahaeng_tutorial_seen";

// 스텝별 spotlight 대기 시간 (ms)
// 1: 사이드바 슬라이드 인 대기, 3: RightPanel 슬라이드 인 대기
const STEP_DELAYS = [80, 420, 80, 520];

interface SpotlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
}

type TooltipSide = "right" | "left" | "bottom";

interface TutorialStep {
  selector: string | null;
  getCustomRect?: () => SpotlightRect;
  title: string;
  description: string;
  tooltipSide: TooltipSide;
  icon: React.ReactNode;
}

const STEPS: TutorialStep[] = [
  {
    selector: null,
    getCustomRect: () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      return { x: vw * 0.25, y: vh * 0.12, w: vw * 0.5, h: vh * 0.65, rx: 16 };
    },
    title: "도시 마커",
    description:
      "지도 위의 점들은 여행 가능한 도시예요.\n클릭하면 해당 도시의 정보가 오른쪽 패널에 표시돼요.",
    tooltipSide: "bottom",
    icon: <MapPin className="size-4 text-blue-500" />,
  },
  {
    selector: '[data-tutorial="trip-settings"]',
    title: "여행 조건 설정",
    description:
      "예산, 여행 기간, 월을 입력하고\n추천 업데이트를 누르면\nAI가 나에게 맞는 여행지를 추천해줘요.",
    tooltipSide: "right",
    icon: <SlidersHorizontal className="size-4 text-blue-500" />,
  },
  {
    selector: '[data-tutorial="top-matching"]',
    title: "TOP 추천 여행지",
    description:
      "설정한 조건에 맞는 여행지를\n매칭 점수 순으로 보여줘요.\n카드를 클릭하면 지도에서 해당 도시가 강조돼요.",
    tooltipSide: "right",
    icon: <Trophy className="size-4 text-blue-500" />,
  },
  {
    selector: '[data-tutorial="right-panel"]',
    getCustomRect: () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(300, vw * 0.22);
      return { x: vw - w - 12, y: 80, w, h: vh - 100, rx: 16 };
    },
    title: "도시 상세 패널",
    description:
      "도시를 선택하면 이곳에 상세 정보가 나타나요.\n일 예산·항공료·안전도를 한눈에 확인하고\n상세 보기로 더 많은 정보를 볼 수 있어요.",
    tooltipSide: "left",
    icon: <PanelRight className="size-4 text-blue-500" />,
  },
];

const TOOLTIP_W = 360;
const TOOLTIP_GAP = 14;

export function TutorialOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const tutorialOpenedPanel = useRef(false);

  const { data: cityList } = useCityList();

  const {
    isLeftSidebarCollapsed,
    toggleLeftSidebar,
    openRightPanel,
    closeRightPanel,
  } = useUiStore();

  // 마지막으로 계산된 툴팁 위치 — rect=null 전환 중에도 이전 위치 유지
  const lastTooltipPosRef = useRef<React.CSSProperties>({});

  useEffect(() => {
    if (!localStorage.getItem(TUTORIAL_KEY)) {
      setVisible(true);
    }
  }, []);

  // 튜토리얼 버튼 클릭 시 재시작
  useEffect(() => {
    const handler = () => {
      setStep(0);
      setRect(null);
      setVisible(true);
    };
    window.addEventListener("dahaeng:open-tutorial", handler);
    return () => window.removeEventListener("dahaeng:open-tutorial", handler);
  }, []);

  const resolveRect = useCallback((stepIndex: number): SpotlightRect | null => {
    const s = STEPS[stepIndex];
    if (!s) return null;
    if (s.selector) {
      const el = document.querySelector(s.selector);
      if (el) {
        const r = el.getBoundingClientRect();
        const pad = 8;
        return {
          x: r.left - pad,
          y: r.top - pad,
          w: r.width + pad * 2,
          h: r.height + pad * 2,
          rx: 14,
        };
      }
    }
    return s.getCustomRect ? s.getCustomRect() : null;
  }, []);

  // 윈도우 리사이즈 시 현재 스텝 rect 재계산
  useEffect(() => {
    if (!visible) return;
    const handleResize = () => setRect(resolveRect(step));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [visible, step, resolveRect]);

  useEffect(() => {
    if (!visible) return;

    // step 1, 2: LeftSidebar 펼침
    if ((step === 1 || step === 2) && isLeftSidebarCollapsed) {
      toggleLeftSidebar();
    }

    // step 3: cityId=1 RightPanel 열기
    if (step === 3) {
      tutorialOpenedPanel.current = true;
      const imgUrl = cityList?.find((c) => c.cityId === 1)?.imgUrl ?? undefined;
      openRightPanel(1, imgUrl);
    }

    const delay = STEP_DELAYS[step] ?? 80;
    const timer = setTimeout(() => setRect(resolveRect(step)), delay);
    return () => clearTimeout(timer);
  }, [step, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    // 이전 spotlight 즉시 제거 → 잔상/순간 위치 오류 방지
    setRect(null);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    if (tutorialOpenedPanel.current) {
      closeRightPanel();
      tutorialOpenedPanel.current = false;
    }
    localStorage.setItem(TUTORIAL_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 툴팁 위치 계산
  if (rect) {
    let pos: React.CSSProperties = {};
    switch (current.tooltipSide) {
      case "right":
        pos = {
          left: Math.min(rect.x + rect.w + TOOLTIP_GAP, vw - TOOLTIP_W - 8),
          top: Math.max(8, Math.min(rect.y + rect.h / 2, vh - 200)),
          transform: "translateY(-50%)",
        };
        break;
      case "left":
        pos = {
          left: Math.max(8, rect.x - TOOLTIP_W - TOOLTIP_GAP),
          top: Math.max(8, Math.min(rect.y + rect.h / 2, vh - 200)),
          transform: "translateY(-50%)",
        };
        break;
      case "bottom":
      default:
        pos = {
          left: "50%",
          bottom: Math.max(24, vh - (rect.y + rect.h) - TOOLTIP_GAP - 160),
          transform: "translateX(-50%)",
        };
    }
    lastTooltipPosRef.current = pos;
  }

  const tooltipStyle: React.CSSProperties = {
    ...lastTooltipPosRef.current,
  };

  return (
    <div
      className="fixed inset-0 z-[500]"
      role="dialog"
      aria-modal="true"
      aria-label="사용법 안내"
    >
      {/* SVG spotlight overlay */}
      <svg
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <mask id="dahaeng-tutorial-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                rx={rect.rx}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.78)"
          mask="url(#dahaeng-tutorial-mask)"
        />
      </svg>

      {/* 클릭 차단 레이어 */}
      <div className="absolute inset-0" />

      {/* 툴팁 카드 — rect가 없는 전환 중엔 완전히 숨김 */}
      {rect && (
        <div
          className="absolute z-10 bg-white rounded-2xl shadow-2xl p-5 flex flex-col gap-3.5"
          style={{ width: TOOLTIP_W, ...tooltipStyle }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {current.icon}
              <div>
                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest leading-none mb-1">
                  {step + 1} / {STEPS.length}
                </p>
                <h3 className="text-[15px] font-bold text-slate-800 leading-tight">
                  {current.title}
                </h3>
              </div>
            </div>
            <button
              onClick={finish}
              className="text-slate-300 hover:text-slate-500 transition-colors shrink-0 mt-0.5"
              aria-label="튜토리얼 닫기"
            >
              <X className="size-4" />
            </button>
          </div>

          <p className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line">
            {current.description}
          </p>

          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === step
                      ? "w-4 h-2 bg-blue-500"
                      : i < step
                        ? "w-2 h-2 bg-blue-200"
                        : "w-2 h-2 bg-slate-200"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 text-[13px] font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-xl px-3.5 py-1.5 transition-colors"
            >
              {step < STEPS.length - 1 ? (
                <>
                  다음 <ChevronRight className="size-3.5" />
                </>
              ) : (
                "시작하기 🎉"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
