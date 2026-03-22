import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export type YoutubeLoadStep = "idle" | "sync" | "analyze" | "fetch";

const SYNC_MESSAGES = [
  "YouTube에 연결하는 중...",
  "재생 목록을 불러오는 중...",
  "좋아요 목록을 불러오는 중...",
  "시청 기록을 처리하는 중...",
  "데이터를 정리하는 중...",
];

const STEPS = [
  { key: "sync",    label: "데이터 수집" },
  { key: "analyze", label: "AI 분석" },
  { key: "fetch",   label: "태그 생성" },
] as const;

const STEP_ORDER: YoutubeLoadStep[] = ["sync", "analyze", "fetch"];

interface YoutubeLoadingOverlayProps {
  step: YoutubeLoadStep;
}

export function YoutubeLoadingOverlay({ step }: YoutubeLoadingOverlayProps) {
  const [syncMsgIdx, setSyncMsgIdx] = useState(0);

  useEffect(() => {
    if (step !== "sync") {
      setSyncMsgIdx(0);
      return;
    }
    const id = setInterval(() => {
      setSyncMsgIdx((prev) => (prev + 1) % SYNC_MESSAGES.length);
    }, 2500);
    return () => clearInterval(id);
  }, [step]);

  if (step === "idle") return null;

  const stepIndex = STEP_ORDER.indexOf(step);

  const mainMessage =
    step === "sync"
      ? "유튜브 데이터를 가져오는 중..."
      : step === "analyze"
        ? "AI가 취향을 분석하는 중..."
        : "여행 태그를 생성하는 중...";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-80 rounded-3xl bg-white p-8 flex flex-col items-center gap-6 shadow-2xl">
        {/* YouTube 아이콘 */}
        <div className="size-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <div className="size-10 rounded-xl bg-red-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="size-5 fill-white" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* 메인 메시지 */}
        <div className="text-center flex flex-col items-center gap-2">
          <Loader2 className="size-5 animate-spin text-blue-500" />
          <p className="font-semibold text-slate-800 text-sm">{mainMessage}</p>
          {step === "sync" && (
            <p key={syncMsgIdx} className="text-xs text-slate-400 animate-pulse">
              {SYNC_MESSAGES[syncMsgIdx]}
            </p>
          )}
        </div>

        {/* 단계 표시 바 */}
        <div className="w-full flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full h-1.5 rounded-full transition-colors duration-500 ${
                  i <= stepIndex ? "bg-blue-500" : "bg-slate-200"
                }`}
              />
              <span
                className={`text-[10px] ${i <= stepIndex ? "text-blue-500 font-medium" : "text-slate-300"}`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center">
          최대 1~2분 정도 소요될 수 있습니다
        </p>
      </div>
    </div>
  );
}
