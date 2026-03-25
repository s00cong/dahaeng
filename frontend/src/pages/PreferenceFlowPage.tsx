import { useState, useEffect } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ListChecks,
  Lock,
  RotateCcw,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreferenceStore } from "@/stores/preferenceStore";
import { useAuthStore } from "@/stores/authStore";
import { youtubeApi } from "@/api/youtube.api";
import { useSearch } from "@tanstack/react-router";
import PreferencePage from "./PreferencePage";
import { YoutubeLoadingOverlay, type YoutubeLoadStep } from "@/components/common/YoutubeLoadingOverlay";

// ─── Step 관리 ───────────────────────────────────────────────────────────────

type Step = "onboarding" | "youtube-consent" | "select";

// ─── 공통 배경 스타일 ─────────────────────────────────────────────────────────

const pageBg =
  "min-h-screen flex flex-col items-center justify-center px-6 bg-[#f0f4ff]";

// ─── Step 1: 온보딩 ───────────────────────────────────────────────────────────

function OnboardingStep({
  onYoutube,
  onDirect,
}: {
  onYoutube: () => void;
  onDirect: () => void;
}) {
  return (
    <div className={pageBg}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="max-w-2xl w-full flex flex-col items-center gap-10"
      >
        {/* 헤딩 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800 leading-snug">
            당신에게 딱 맞는 여행지를 추천해드릴게요 ✨
          </h1>
          <p className="mt-3 text-slate-500">취향을 자동으로 분석할까요?</p>
        </div>

        {/* 선택 카드 */}
        <div className="grid grid-cols-2 gap-5 w-full">
          {/* YouTube 카드 */}
          <button
            type="button"
            onClick={onYoutube}
            className="relative flex flex-col items-center gap-5 pt-10 pb-8 px-6 rounded-2xl bg-white border-2 border-transparent hover:border-blue-400 transition-all shadow-sm hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white whitespace-nowrap">
              가장 빠름 ⚡
            </span>
            <YoutubeIcon size="lg" />
            <div className="text-center">
              <p className="font-bold text-slate-800 text-base">
                YouTube로 빠르게 분석하기
              </p>
              <p className="text-sm text-slate-400 mt-1.5">
                영상 시청 기록을 기반으로 취향 파악
              </p>
            </div>
          </button>

          {/* 직접 선택 카드 */}
          <button
            type="button"
            onClick={onDirect}
            className="flex flex-col items-center gap-5 py-8 px-6 rounded-2xl bg-white border-2 border-transparent hover:border-blue-400 transition-all shadow-sm hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <ListChecks className="size-8 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-800 text-base">
                직접 선택하기
              </p>
              <p className="text-sm text-slate-400 mt-1.5">
                원하는 키워드를 직접 골라보세요
              </p>
            </div>
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          분석 정보는 추천 결과 산출을 위해서만 사용되며 별도로 저장되지
          않습니다.
        </p>
      </motion.div>
    </div>
  );
}

// ─── Step 2: YouTube 동의 ─────────────────────────────────────────────────────

const YOUTUBE_FEATURES = [
  {
    icon: CheckCircle2,
    title: "데이터 최소 활용",
    desc: "영상 제목과 키워드만 사용하여 취향을 파악합니다.",
    color: "text-blue-500",
  },
  {
    icon: Lock,
    title: "개인정보 보호",
    desc: "로그인 정보나 개인 식별 정보는 저장하지 않습니다.",
    color: "text-blue-500",
  },
  {
    icon: RotateCcw,
    title: "언제든지 해제 가능",
    desc: "설정 메뉴에서 언제든지 연동을 해제할 수 있습니다.",
    color: "text-blue-500",
  },
] as const;

function YoutubeConsentStep({
  onAgree,
  onCancel,
  loadingStep,
}: {
  onAgree: () => Promise<void>;
  onCancel: () => void;
  loadingStep: YoutubeLoadStep;
}) {
  const isLoading = loadingStep !== "idle";

  const handleAgree = async () => {
    await onAgree();
  };

  return (
    <div className={pageBg}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center gap-6"
      >
        {/* 아이콘 */}
        <YoutubeIcon size="lg" />

        <h2 className="text-xl font-bold text-slate-800 text-center leading-snug">
          YouTube 좋아요/저장 영상을
          <br />
          분석합니다.
        </h2>

        {/* 기능 목록 */}
        <div className="w-full flex flex-col">
          {YOUTUBE_FEATURES.map((f, i) => (
            <div key={f.title}>
              {i > 0 && <div className="h-px bg-slate-100" />}
              <div className="flex items-start gap-3 py-4">
                <f.icon className={`size-5 shrink-0 mt-0.5 ${f.color}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {f.title}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 버튼 */}
        <div className="w-full flex flex-col gap-2.5">
          <Button
            onClick={handleAgree}
            disabled={isLoading}
            className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                연결 중...
              </>
            ) : (
              <>
                <YoutubeIcon size="sm" className="mr-2" />
                동의하고 분석하기
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-sm rounded-xl transition-colors"
          >
            취소
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          연동 시 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
        </p>
      </motion.div>
    </div>
  );
}

// ─── 공용 YouTube 아이콘 ──────────────────────────────────────────────────────

function YoutubeIcon({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const containerSize =
    size === "lg" ? "size-16" : size === "md" ? "size-10" : "size-5";
  const bgSize =
    size === "lg" ? "size-10" : size === "md" ? "size-7" : "size-4";
  const svgSize =
    size === "lg" ? "size-5" : size === "md" ? "size-3.5" : "size-2.5";

  if (size === "sm") {
    return (
      <span
        className={`inline-flex items-center justify-center size-5 rounded-md bg-red-500 ${className}`}
      >
        <svg
          viewBox="0 0 24 24"
          className={svgSize + " fill-white"}
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
    );
  }

  return (
    <div
      className={`${containerSize} rounded-2xl bg-red-50 flex items-center justify-center ${className}`}
    >
      <div
        className={`${bgSize} rounded-xl bg-red-500 flex items-center justify-center`}
      >
        <svg
          viewBox="0 0 24 24"
          className={svgSize + " fill-white"}
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

// ─── 메인: PreferenceFlowPage ─────────────────────────────────────────────────

const PreferenceFlowPage = () => {
  const { hasCompletedPreference } = useAuthStore();
  const { setYoutubeAutoSelected, setYoutubeTagIds } = usePreferenceStore();
  const { preview } = useSearch({ from: "/preference" });

  // 마이페이지에서 "태그 수정"으로 진입한 경우만 edit 모드
  // preview=onboarding이면 테스트용이므로 edit 아님
  const isEditMode = hasCompletedPreference && preview !== "onboarding";

  const [step, setStep] = useState<Step>(isEditMode ? "select" : "onboarding");
  const [loadingStep, setLoadingStep] = useState<YoutubeLoadStep>("idle");

  // 브라우저 뒤로가기 → select 단계에서 onboarding으로 이동
  useEffect(() => {
    if (step !== "select" || isEditMode) return;
    window.history.pushState(null, "");
    const handlePopState = () => setStep("onboarding");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [step, isEditMode]);

  const handleYoutubeAgree = async () => {
    try {
      setLoadingStep("sync");
      await youtubeApi.sync();
      setLoadingStep("analyze");
      await youtubeApi.analyze();
      setLoadingStep("fetch");
      const { tagIds, tagNames } = await youtubeApi.getInterestTags();
      setYoutubeTagIds(tagIds);
      usePreferenceStore.getState().setSelectedTags(tagNames);
      await youtubeApi.updateSyncPreference(true);
      setYoutubeAutoSelected(true);
      setLoadingStep("idle");
      setStep("select");
    } catch {
      setLoadingStep("idle");
      setYoutubeAutoSelected(false);
      toast.error("YouTube 분석에 실패했습니다. 뒤로가기 후 직접 선택해주세요.");
    }
  };

  if (step === "onboarding") {
    return (
      <OnboardingStep
        onYoutube={() => setStep("youtube-consent")}
        onDirect={() => setStep("select")}
      />
    );
  }

  if (step === "youtube-consent") {
    return (
      <>
        <YoutubeLoadingOverlay step={loadingStep} />
        <YoutubeConsentStep
          onAgree={handleYoutubeAgree}
          onCancel={() => setStep("onboarding")}
          loadingStep={loadingStep}
        />
      </>
    );
  }

  return <PreferencePage isEdit={isEditMode} onBack={isEditMode ? undefined : () => setStep("onboarding")} />;
};

export default PreferenceFlowPage;
