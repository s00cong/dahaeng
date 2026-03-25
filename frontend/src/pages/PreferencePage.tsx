import { useState, useMemo, useEffect, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Mountain,
  Building2,
  UtensilsCrossed,
  Sparkles,
  Zap,
  Tags,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Circle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagCategorySection } from "@/components/preference/TagCategorySection";
import { usePreferenceStore } from "@/stores/preferenceStore";
import { useSubmitPreference, useUpdatePreference } from "@/hooks/auth/usePreference";
import { useTagList } from "@/hooks/tag/useTagList";
import { useMemberTags } from "@/hooks/auth/useMemberTags";
import { youtubeApi } from "@/api/youtube.api";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { YoutubeLoadingOverlay, type YoutubeLoadStep } from "@/components/common/YoutubeLoadingOverlay";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// 카테고리명 → 아이콘 매핑 (백엔드 categoryName 키워드 기반)
// ---------------------------------------------------------------------------

const CATEGORY_ICON_MAP: { keyword: string; icon: LucideIcon }[] = [
  { keyword: "자연", icon: Mountain },
  { keyword: "아웃도어", icon: Mountain },
  { keyword: "도시", icon: Building2 },
  { keyword: "문화", icon: Building2 },
  { keyword: "음식", icon: UtensilsCrossed },
  { keyword: "쇼핑", icon: UtensilsCrossed },
  { keyword: "액티비티", icon: Zap },
  { keyword: "스포츠", icon: Zap },
  { keyword: "여행", icon: Sparkles },
  { keyword: "스타일", icon: Sparkles },
];

function getCategoryIcon(categoryName: string): LucideIcon {
  for (const { keyword, icon } of CATEGORY_ICON_MAP) {
    if (categoryName.includes(keyword)) return icon;
  }
  return Tags; // 기본 아이콘
}

// ---------------------------------------------------------------------------
// 단계 표시
// ---------------------------------------------------------------------------

const STEPS = [
  { label: "로그인 완료", status: "completed" as const },
  { label: "취향 선택", status: "active" as const },
  { label: "여행 시작", status: "pending" as const },
] as const;

type StepStatus = "completed" | "active" | "pending";

const POSITIVE_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Framer Motion variants
// ---------------------------------------------------------------------------

const pageVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const sidebarVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: "easeOut", delay: 0.1 },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut", delay: 0.15 },
  },
};

const categoriesVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.25 },
  },
};

const categoryItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StepIndicatorProps {
  label: string;
  status: StepStatus;
  isLast: boolean;
}

function StepIndicator({ label, status, isLast }: StepIndicatorProps) {
  return (
    <li className="flex flex-col items-start gap-0">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex items-center justify-center size-7 rounded-full border-2 shrink-0 transition-colors",
            status === "completed" && "bg-blue-600 border-blue-600 text-white",
            status === "active" &&
              "bg-blue-600/20 border-blue-500 text-blue-400",
            status === "pending" &&
              "bg-slate-800 border-slate-600 text-slate-500",
          )}
          aria-hidden="true"
        >
          {status === "completed" ? (
            <Check className="size-3.5" />
          ) : status === "active" ? (
            <span className="size-2 rounded-full bg-blue-400" />
          ) : (
            <Circle className="size-3 opacity-50" />
          )}
        </span>
        <span
          className={cn(
            "text-sm font-medium",
            status === "completed" && "text-slate-400 line-through",
            status === "active" && "text-blue-300 font-semibold",
            status === "pending" && "text-slate-500",
          )}
        >
          {label}
        </span>
      </div>
      {!isLast && (
        <div
          className={cn(
            "w-px h-6 ml-3.5 mt-0.5",
            status === "completed" ? "bg-blue-600/50" : "bg-slate-700",
          )}
          aria-hidden="true"
        />
      )}
    </li>
  );
}

interface SelectionCounterProps {
  count: number;
}

function SelectionCounter({ count }: SelectionCounterProps) {
  const isPositive = count >= POSITIVE_THRESHOLD;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400">선택된 취향</span>
      <span
        className={cn(
          "text-sm font-bold tabular-nums transition-colors",
          count === 0 && "text-slate-500",
          count > 0 && !isPositive && "text-blue-300",
          isPositive && "text-emerald-400",
        )}
      >
        {count}개
      </span>
      {isPositive && (
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs text-emerald-400 font-medium"
        >
          잘 선택하셨어요!
        </motion.span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const PreferencePage = ({ isEdit = false, onBack }: { isEdit?: boolean; onBack?: () => void }) => {
  // 서버에서 태그 목록 fetch
  const { data: tagList = [], isLoading: isTagLoading, isError: isTagError } = useTagList();
  const { data: memberTags = [], isLoading: isMemberTagLoading } = useMemberTags();

  const { youtubeTagIds, setYoutubeTagIds } = usePreferenceStore();

  // 새로고침 후에도 배너가 유지되도록 서버에서 직접 조회
  const { data: syncStatus } = useQuery({
    queryKey: ["youtube", "sync-status"],
    queryFn: youtubeApi.getSyncStatus,
  });
  const youtubeAutoSelected = syncStatus
    ? syncStatus.connected && syncStatus.syncEnabled !== false
    : false;
  const [updateStep, setUpdateStep] = useState<YoutubeLoadStep>("idle");

  // edit 모드: 서버에서 불러온 기존 태그로 초기화
  // 신규 등록: YouTube 분석 결과가 있으면 초기값, 없으면 빈 배열
  const savedTagIds = memberTags.map((t) => t.tagId);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    youtubeTagIds.length > 0 ? youtubeTagIds : [],
  );

  // YouTube 업데이트 여부 추적 — true이면 서버 태그로 초기화 방지
  const youtubeUpdatedRef = useRef(false);

  // edit 모드에서 서버 태그 로딩 완료 후 초기 선택 세팅
  // YouTube 업데이트 후에는 실행되지 않도록 ref로 방지
  useEffect(() => {
    if (isEdit && !isMemberTagLoading && savedTagIds.length > 0 && !youtubeUpdatedRef.current) {
      setSelectedTagIds(savedTagIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMemberTagLoading]);
  const submitResult = useSubmitPreference();
  const updateResult = useUpdatePreference();
  const { mutate, isPending } = isEdit ? updateResult : submitResult;

  // 태그 토글
  const handleToggle = (id: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // 선택 완료 → 서버에 tagIds 전송 + preferenceStore에 태그 이름 저장
  const handleSubmit = () => {
    const tagNames = tagList
      .filter((t) => selectedTagIds.includes(t.tagId))
      .map((t) => t.tagName);
    usePreferenceStore.getState().setSelectedTags(tagNames);
    mutate(selectedTagIds);
  };

  // YouTube 추천 태그 업데이트
  const handleYoutubeUpdate = async () => {
    try {
      setUpdateStep("sync");
      await youtubeApi.sync();
      setUpdateStep("analyze");
      await youtubeApi.analyze();
      setUpdateStep("fetch");
      const { tagIds, tagNames } = await youtubeApi.getInterestTags();
      youtubeUpdatedRef.current = true;
      setYoutubeTagIds(tagIds);
      setSelectedTagIds(tagIds);
      usePreferenceStore.getState().setSelectedTags(tagNames);
    } catch (err) {
      console.error("YouTube 태그 업데이트 실패:", err);
      toast.error("YouTube 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUpdateStep("idle");
    }
  };

  // categoryName 기준으로 태그 그룹화
  const categories = useMemo(() => {
    const map = new Map<string, { categoryId: number; tags: { id: number; name: string }[] }>();
    for (const tag of tagList) {
      if (!map.has(tag.categoryName)) {
        map.set(tag.categoryName, { categoryId: tag.categoryId, tags: [] });
      }
      map.get(tag.categoryName)!.tags.push({ id: tag.tagId, name: tag.tagName });
    }
    return [...map.entries()].map(([name, { categoryId, tags }]) => ({
      category: name,
      categoryId,
      icon: getCategoryIcon(name),
      tags,
    }));
  }, [tagList]);

  // 전체 태그 수 (progress bar 최댓값)
  const totalTagCount = tagList.length || 25;

  return (
    <>
    <YoutubeLoadingOverlay step={updateStep} />
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-[#0f172a] text-white"
    >
      <div className="flex min-h-screen">
        {/* ---------------------------------------------------------------- */}
        {/* Left Sidebar                                                      */}
        {/* ---------------------------------------------------------------- */}
        <motion.aside
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
          className={cn(
            "w-64 shrink-0 flex flex-col justify-between",
            "px-6 py-8",
            "border-r border-slate-700/60",
            "bg-slate-900/60 backdrop-blur-sm",
          )}
          aria-label="단계 안내 사이드바"
        >
          <div className="flex flex-col gap-10">
            <div>
              <span
                className="text-2xl font-bold tracking-tight text-white"
                aria-label="다행 앱 로고"
              >
                다행
              </span>
              <p className="mt-1 text-xs text-slate-500">나에게 맞는 여행</p>
            </div>
            <nav aria-label="설정 단계">
              <ul className="flex flex-col" role="list">
                {STEPS.map((step, idx) => (
                  <StepIndicator
                    key={step.label}
                    label={step.label}
                    status={step.status}
                    isLast={idx === STEPS.length - 1}
                  />
                ))}
              </ul>
            </nav>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            당신의 취향을 알려주세요.
            <br />더 정확한 여행지를 추천해 드립니다.
          </p>
        </motion.aside>

        {/* ---------------------------------------------------------------- */}
        {/* Right Content                                                     */}
        {/* ---------------------------------------------------------------- */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col flex-1 px-8 py-10 max-w-3xl w-full mx-auto"
          >
            {/* Header */}
            <header className="mb-8">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center gap-1.5 mb-5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  뒤로가기
                </button>
              )}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white leading-snug">
                    어떤 여행을 좋아하시나요?
                  </h1>
                  <p className="mt-2 text-sm text-slate-400">
                    관심 있는 여행 스타일을 모두 선택해 주세요{" "}
                    <span className="text-slate-500">(최소 1개)</span>
                  </p>
                </div>
                <div className="mt-1">
                  <SelectionCounter count={selectedTagIds.length} />
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="mt-5 h-1 w-full rounded-full bg-slate-800 overflow-hidden"
                role="progressbar"
                aria-valuenow={selectedTagIds.length}
                aria-valuemin={0}
                aria-valuemax={totalTagCount}
                aria-label="태그 선택 진행도"
              >
                <motion.div
                  className="h-full rounded-full bg-blue-600"
                  animate={{
                    width: `${Math.min((selectedTagIds.length / totalTagCount) * 100, 100)}%`,
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </header>

            {/* YouTube 자동 선택 배너 — 온보딩 직접선택 플로우에서는 숨김 */}
            {youtubeAutoSelected && !onBack && !isPending && (
              <div className="mb-6 flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="size-9 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="size-4 fill-white" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">
                      YouTube 활동을 바탕으로 일부 태그가 자동 선택되었습니다.
                    </p>
                    <button
                      type="button"
                      onClick={handleYoutubeUpdate}
                      disabled={updateStep !== "idle"}
                      className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {updateStep !== "idle" ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3" />
                      )}
                      {updateStep !== "idle" ? "업데이트 중..." : "업데이트하기"}
                    </button>
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">
                    사용자의 시청 기록을 분석하여 취향을 반영했습니다. 자유롭게 수정 가능합니다.
                  </p>
                </div>
              </div>
            )}

            {/* 태그 목록 로딩 중 */}
            {isTagLoading && (
              <div
                className="flex flex-col items-center justify-center flex-1 gap-3 py-16"
                role="status"
                aria-label="태그 목록 불러오는 중"
              >
                <Loader2 className="size-8 text-blue-400 animate-spin" />
                <p className="text-sm text-slate-400">태그 목록을 불러오는 중...</p>
              </div>
            )}

            {/* 태그 목록 에러 */}
            {!isTagLoading && isTagError && (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16 text-center">
                <AlertTriangle className="size-8 text-yellow-400" />
                <p className="text-sm font-medium text-slate-300">태그를 불러올 수 없습니다.</p>
                <p className="text-xs text-slate-500">나중에 다시 시도해주세요.</p>
              </div>
            )}

            {/* 태그 카테고리 목록 */}
            {!isTagLoading && !isTagError && (
              <motion.div
                variants={categoriesVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-7 flex-1"
              >
                {categories.map((cat) => (
                  <motion.div key={cat.categoryId} variants={categoryItemVariants}>
                    <TagCategorySection
                      category={cat.category}
                      icon={cat.icon}
                      tags={cat.tags}
                      selectedTagIds={selectedTagIds}
                      onToggle={handleToggle}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* CTA Footer */}
            <footer className="mt-10 pt-6 border-t border-slate-700/60">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {selectedTagIds.length === 0 ? (
                  <p className="text-sm text-slate-500 order-2 sm:order-1">
                    최소 1개 이상의 태그를 선택해 주세요.
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 order-2 sm:order-1">
                    <span className="text-blue-300 font-semibold">
                      {selectedTagIds.length}개
                    </span>
                    의 취향이 선택되었습니다.
                  </p>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={isPending || selectedTagIds.length === 0}
                  size="lg"
                  className={cn(
                    "order-1 sm:order-2 min-w-[160px]",
                    "bg-blue-600 hover:bg-blue-500 text-white",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    "transition-all duration-200",
                    selectedTagIds.length > 0 && "shadow-lg shadow-blue-900/50",
                  )}
                  aria-label={
                    isPending ? "선호도 저장 중" : "선택 완료 후 여행 시작"
                  }
                >
                  {isPending ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      저장 중...
                    </>
                  ) : (
                    <>
                      선택 완료
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </footer>
          </motion.div>
        </main>
      </div>
    </motion.div>
    </>
  );
};

export default PreferencePage;
