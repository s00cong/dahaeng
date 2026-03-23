import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { youtubeApi } from "@/api/youtube.api";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Link2,
  LogOut,
  Loader2,
  Pencil,
  CheckCircle2,
  Lock,
  RotateCcw,
  X,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";
import { usePreferenceStore } from "@/stores/preferenceStore";
import { useLogout } from "@/hooks/auth/useLogout";
import { useMemberTags } from "@/hooks/auth/useMemberTags";
import { useTagList } from "@/hooks/tag/useTagList";
import { authApi } from "@/api/auth.api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Framer Motion variants ───────────────────────────────────────────────────

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

// ─── Profile avatar ───────────────────────────────────────────────────────────

interface ProfileAvatarProps {
  profileImageUrl: string | null;
  name: string;
}

function ProfileAvatar({ profileImageUrl, name }: ProfileAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const initial = name.charAt(0).toUpperCase();

  if (imgError || !profileImageUrl) {
    return (
      <div
        aria-hidden="true"
        className="flex size-20 shrink-0 items-center justify-center rounded-full bg-blue-500 text-2xl font-bold text-white select-none"
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={profileImageUrl}
      alt={`${name} 프로필 사진`}
      width={60}
      height={60}
      onError={() => setImgError(true)}
      className="size-20 shrink-0 rounded-full object-cover"
    />
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none"
      style={{ backgroundColor: checked ? "#3b82f6" : "#374151" }}
    >
      <span
        className="pointer-events-none inline-block size-5 rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ─── YouTube Modal ────────────────────────────────────────────────────────────

const YOUTUBE_FEATURES = [
  {
    icon: CheckCircle2,
    title: "데이터 최소 활용",
    desc: "영상 제목과 키워드만 사용하여 취향을 파악합니다.",
  },
  {
    icon: Lock,
    title: "개인정보 보호",
    desc: "로그인 정보나 개인 식별 정보는 저장하지 않습니다.",
  },
  {
    icon: RotateCcw,
    title: "언제든지 해제 가능",
    desc: "설정 메뉴에서 언제든지 연동을 해제할 수 있습니다.",
  },
] as const;

function YoutubeModal({
  action,
  onConfirm,
  onCancel,
}: {
  action: "connect" | "disconnect";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (action === "connect") {
      setIsLoading(true);
      try {
        const { loginUrl } = await authApi.getYoutubeConsentUrl();
        window.location.href = loginUrl.startsWith("http")
          ? loginUrl
          : `${window.location.origin}${loginUrl.startsWith("/") ? "" : "/"}${loginUrl}`;
      } catch {
        onConfirm();
      } finally {
        setIsLoading(false);
      }
    } else {
      onConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="닫기"
        >
          <X className="size-5" />
        </button>

        {/* YouTube 아이콘 */}
        <div className="size-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <div className="size-10 rounded-xl bg-red-500 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="size-5 fill-white"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800 text-center leading-snug">
          {action === "connect"
            ? "YouTube 좋아요/저장 영상을\n분석합니다."
            : "YouTube 연동을\n해제하시겠어요?"}
        </h2>

        {/* 기능 목록 */}
        <div className="w-full flex flex-col">
          {YOUTUBE_FEATURES.map((f, i) => (
            <div key={f.title}>
              {i > 0 && <div className="h-px bg-slate-100" />}
              <div className="flex items-start gap-3 py-4">
                <f.icon className="size-5 shrink-0 mt-0.5 text-blue-500" />
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
            onClick={handleConfirm}
            disabled={isLoading}
            className={`w-full h-12 font-semibold text-base rounded-xl ${
              action === "disconnect"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <div className="size-5 rounded-md bg-red-500 flex items-center justify-center mr-2">
                <svg
                  viewBox="0 0 24 24"
                  className="size-3 fill-white"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
            {action === "connect"
              ? "유튜브 연동 동의하기"
              : "유튜브 연동 해지하기"}
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
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const MyPage = () => {
  const { user, hasCompletedPreference } = useAuthStore();
  const { setYoutubeAutoSelected } = usePreferenceStore();
  const { mutate: logout, isPending: isLogoutPending } = useLogout();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { data: memberTags = [] } = useMemberTags();
  const { data: tagList = [] } = useTagList();

  // 저장된 tagId → 태그명 변환
  const savedTagIds = memberTags.map((t) => t.tagId);
  const savedTagNames = tagList
    .filter((t) => savedTagIds.includes(t.tagId))
    .map((t) => t.tagName);

  // YouTube 연동 상태 (서버에서 조회)
  const { data: syncStatus } = useQuery({
    queryKey: ["youtube", "sync-status"],
    queryFn: youtubeApi.getSyncStatus,
  });
  // 계정 자체가 OAuth 연결되어 있는지
  const isYoutubeAccountLinked = syncStatus?.connected ?? false;
  // 계정 연결 + syncEnabled 활성 상태
  const youtubeConnected = isYoutubeAccountLinked && syncStatus?.syncEnabled !== false;

  const [youtubeModalAction, setYoutubeModalAction] = useState<
    "connect" | "disconnect" | null
  >(null);

  const handleYoutubeToggleClick = () => {
    setYoutubeModalAction(youtubeConnected ? "disconnect" : "connect");
  };

  const handleYoutubeModalConfirm = () => {
    const action = youtubeModalAction;
    setYoutubeModalAction(null);

    if (action === "disconnect") {
      // 동기화 비활성화
      youtubeApi.updateSyncPreference(false)
        .then(() => queryClient.invalidateQueries({ queryKey: ["youtube", "sync-status"] }))
        .catch(console.error);
    } else if (action === "connect" && isYoutubeAccountLinked) {
      // 계정은 연결됐지만 sync만 꺼져 있던 경우 → 재활성화
      youtubeApi.updateSyncPreference(true)
        .then(() => queryClient.invalidateQueries({ queryKey: ["youtube", "sync-status"] }))
        .catch(console.error);
    }
    // 계정 자체가 미연동인 경우 → 모달 내부에서 OAuth 리다이렉트 처리
  };

  const handleTagEdit = () => {
    setYoutubeAutoSelected(youtubeConnected);
    navigate({ to: "/preference" });
  };

  return (
    <main
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #0d1b2e 0%, #0f2040 100%)",
      }}
    >
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-10">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-5"
        >
          {/* ── Section 1: Profile Card ─────────────────────────────────── */}
          <motion.div variants={fadeInUp}>
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-5">
                {user ? (
                  <ProfileAvatar
                    profileImageUrl={user.profileImageUrl}
                    name={user.nickname}
                  />
                ) : (
                  <div className="size-20 shrink-0 rounded-full bg-white/10 animate-pulse" />
                )}

                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-white truncate">
                      {user?.nickname ?? "사용자"}
                    </h3>
                    {hasCompletedPreference ? (
                      <Badge
                        variant="default"
                        className="bg-blue-500/20 text-blue-300 border-blue-500/30"
                      >
                        선호도 완료
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-white/10 text-white/60"
                      >
                        선호도 미완료
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-white/50 truncate">
                    {user?.email ?? ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => logout()}
                  disabled={isLogoutPending}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                  aria-label="로그아웃"
                >
                  {isLogoutPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  <span>로그아웃</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Section 2: 나의 여행 태그 ────────────────────────────────── */}
          <motion.div variants={fadeInUp}>
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className="size-5 rounded bg-blue-500"
                    aria-hidden="true"
                  />
                  <h2 className="text-base font-bold text-white">
                    나의 여행 태그
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleTagEdit}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Pencil className="size-3" />
                  태그 수정
                </button>
              </div>

              {savedTagNames.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {savedTagNames.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full text-sm text-blue-300 border border-blue-500/40"
                      style={{ background: "rgba(59,130,246,0.08)" }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-sm text-white/30">
                    선택된 태그가 없습니다
                  </span>
                </div>
              )}

              <p className="text-xs text-white/40">
                유튜브 시청 패턴과 선택한 태그를 기반으로 맞춤 여행을 추천합니다
              </p>
            </div>
          </motion.div>

          {/* ── Section 3: 연결된 계정 ───────────────────────────────────── */}
          <motion.div variants={fadeInUp}>
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <Link2 className="size-4 text-white/70" />
                <h2 className="text-base font-bold text-white">연결된 계정</h2>
              </div>

              {/* YouTube */}
              <div className="flex items-center gap-4 py-4">
                <div
                  className="size-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#ff0000" }}
                  aria-label="YouTube"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6 fill-white"
                    aria-hidden="true"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">YouTube</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {youtubeConnected
                      ? "마지막 동기화: 2시간 전"
                      : "계정과 연결되어 있지 않습니다"}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {youtubeConnected && (
                    <span className="text-xs font-bold text-teal-400 tracking-widest">
                      CONNECTED
                    </span>
                  )}
                  <Toggle
                    checked={youtubeConnected}
                    onChange={handleYoutubeToggleClick}
                  />
                  <button
                    type="button"
                    onClick={handleYoutubeToggleClick}
                    className={`text-xs font-medium transition-colors ${youtubeConnected ? "text-white/40 hover:text-white/70" : "text-blue-400 hover:text-blue-300"}`}
                  >
                    {youtubeConnected ? "연결 해제" : "연결하기"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Section 4: 하단 푸터 ─────────────────────────────────────── */}
          <motion.div variants={fadeInUp}>
            <div className="text-center py-4 flex flex-col gap-2">
              <p className="text-xs text-white/30">
                데이터를 삭제하거나 계정을 탈퇴하고 싶으신가요?
              </p>
              <div className="flex items-center justify-center gap-3 text-xs">
                <button
                  type="button"
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  이용 약관
                </button>
                <span className="text-white/20">|</span>
                <button
                  type="button"
                  className="text-red-400 hover:text-red-300 transition-colors font-medium"
                >
                  회원 탈퇴
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* YouTube 연동/해제 모달 */}
      <AnimatePresence>
        {youtubeModalAction && (
          <YoutubeModal
            action={youtubeModalAction}
            onConfirm={handleYoutubeModalConfirm}
            onCancel={() => setYoutubeModalAction(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
};

export default MyPage;
