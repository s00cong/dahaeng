import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/utils/queryKeys";
import { youtubeApi } from "@/api/youtube.api";
import { flightAlertApi } from "@/api/flight-alert.api";
import { useUpsertFlightAlert } from "@/hooks/flight-alert/useUpsertFlightAlert";
import { useDeleteFlightAlert } from "@/hooks/flight-alert/useDeleteFlightAlert";
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
  AlertTriangle,
  UserX,
  LogIn,
  Bell,
  BellOff,
  Trash2,
  Check,
} from "lucide-react";
import { CITY_NAME_KO } from "@/data/cityNameKo";
import { COUNTRY_NAME_KO } from "@/data/countryNameKo";
import type { FlightAlertSubscription } from "@/schemas/flight-alert.schema";
import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";
import { usePreferenceStore } from "@/stores/preferenceStore";
import { useLogout } from "@/hooks/auth/useLogout";
import { useWithdraw } from "@/hooks/auth/useWithdraw";
import { useMemberTags } from "@/hooks/auth/useMemberTags";
import { useTagList } from "@/hooks/tag/useTagList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── 대륙 매핑 ────────────────────────────────────────────────────────────────

const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // 아시아
  Japan: "아시아",
  China: "아시아",
  Thailand: "아시아",
  Philippines: "아시아",
  Taiwan: "아시아",
  Singapore: "아시아",
  Malaysia: "아시아",
  Cambodia: "아시아",
  Mongolia: "아시아",
  India: "아시아",
  Indonesia: "아시아",
  Laos: "아시아",
  Vietnam: "아시아",
  Nepal: "아시아",
  Kazakhstan: "아시아",
  "South Korea": "아시아",
  Qatar: "아시아",
  "United Arab Emirates": "아시아",
  Maldives: "아시아",
  Palau: "아시아",
  // 유럽
  France: "유럽",
  Russia: "유럽",
  "United Kingdom": "유럽",
  Germany: "유럽",
  Italy: "유럽",
  Netherlands: "유럽",
  Switzerland: "유럽",
  "Czech Republic": "유럽",
  Austria: "유럽",
  Croatia: "유럽",
  Portugal: "유럽",
  Greece: "유럽",
  Poland: "유럽",
  Sweden: "유럽",
  Norway: "유럽",
  Iceland: "유럽",
  Denmark: "유럽",
  Belgium: "유럽",
  Hungary: "유럽",
  Finland: "유럽",
  Turkey: "유럽",
  // 북아메리카
  Canada: "북아메리카",
  Mexico: "북아메리카",
  Cuba: "북아메리카",
  "United States": "북아메리카",
  // 남아메리카
  Brazil: "남아메리카",
  Bolivia: "남아메리카",
  Argentina: "남아메리카",
  Chile: "남아메리카",
  Peru: "남아메리카",
  // 아프리카
  "South Africa": "아프리카",
  Egypt: "아프리카",
  Mauritius: "아프리카",
  Morocco: "아프리카",
  Kenya: "아프리카",
  // 오세아니아
  Australia: "오세아니아",
  "New Zealand": "오세아니아",
};

const CONTINENT_ORDER = [
  "아시아",
  "유럽",
  "북아메리카",
  "남아메리카",
  "아프리카",
  "오세아니아",
];

// ─── FlightAlertItem ──────────────────────────────────────────────────────────

interface FlightAlertItemProps {
  sub: FlightAlertSubscription;
  editingCityId: number | null;
  setEditingCityId: (id: number | null) => void;
}

function FlightAlertItem({ sub, editingCityId, setEditingCityId }: FlightAlertItemProps) {
  const isEditing = editingCityId === sub.cityId;
  const [inputPrice, setInputPrice] = useState(String(sub.thresholdPrice));
  const { mutate: upsert, isPending: isUpserting } = useUpsertFlightAlert();
  const { mutate: deleteAlert, isPending: isDeleting } = useDeleteFlightAlert();
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setEditingCityId(null);
        setInputPrice(String(sub.thresholdPrice));
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isEditing, sub.thresholdPrice, setEditingCityId]);

  const handleSave = () => {
    const price = Number(inputPrice.replace(/,/g, ""));
    if (!price || price < 1) return;
    upsert(
      { cityId: sub.cityId, thresholdPrice: price },
      { onSuccess: () => setEditingCityId(null) },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditingCityId(null);
      setInputPrice(String(sub.thresholdPrice));
    }
  };

  return (
    <div
      ref={rowRef}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      {/* 도시 / 국가 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {CITY_NAME_KO[sub.cityName] ?? sub.cityName}
        </p>
        <p className="text-xs text-white/40 truncate">
          {COUNTRY_NAME_KO[sub.countryName] ?? sub.countryName}
        </p>
      </div>

      {/* 목표가 표시 or 편집 */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50">₩</span>
            <input
              type="text"
              inputMode="numeric"
              value={inputPrice}
              onChange={(e) =>
                setInputPrice(e.target.value.replace(/[^0-9]/g, ""))
              }
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-28 px-2.5 py-1 text-sm rounded-md bg-white text-slate-800 border border-white/40 focus:outline-none focus:border-blue-400 text-right"
            />
            <button
              onClick={handleSave}
              disabled={isUpserting}
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
              aria-label="저장"
            >
              {isUpserting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
            </button>
            <button
              onClick={() => {
                setEditingCityId(null);
                setInputPrice(String(sub.thresholdPrice));
              }}
              className="text-white/30 hover:text-white/60 transition-colors"
              aria-label="취소"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-white/40">목표</span>
                <span className="text-sm font-bold text-blue-300">
                  ₩{sub.thresholdPrice.toLocaleString()}
                </span>
                <button
                  onClick={() => setEditingCityId(sub.cityId)}
                  className="text-white/30 hover:text-white/60 transition-colors ml-0.5"
                  aria-label="목표가 수정"
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
            </div>
            {/* 삭제 버튼 */}
            <button
              onClick={() => deleteAlert(sub.cityId)}
              disabled={isDeleting}
              className="text-white/20 hover:text-red-400 transition-colors"
              aria-label="알림 삭제"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
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
  const handleConfirm = () => {
    onConfirm();
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
            className={`w-full h-12 font-semibold text-base rounded-xl ${
              action === "disconnect"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            <div className="size-5 rounded-md bg-red-500 flex items-center justify-center mr-2">
              <svg
                viewBox="0 0 24 24"
                className="size-3 fill-white"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            {action === "connect"
              ? "유튜브 연동 동의하기"
              : "유튜브 연동 해지하기"}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-sm rounded-xl transition-colors"
          >
            취소
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────

function WithdrawModal({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
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
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="닫기"
        >
          <X className="size-5" />
        </button>

        <div className="size-16 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="size-8 text-red-500" />
        </div>

        <div className="text-center flex flex-col gap-2">
          <h2 className="text-xl font-bold text-slate-800">
            정말 탈퇴하시겠어요?
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            탈퇴 시 모든 데이터(북마크, 선호도, 연동 정보)가
            <br />
            <span className="font-semibold text-red-500">영구적으로 삭제</span>
            되며 복구할 수 없습니다.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2.5">
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="w-full h-12 font-semibold text-base rounded-xl bg-red-500 hover:bg-red-600 text-white"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : null}
            {isPending ? "탈퇴 처리 중..." : "회원 탈퇴"}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
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
  const { user, hasCompletedPreference, isGuest } = useAuthStore();
  const { setYoutubeAutoSelected } = usePreferenceStore();
  const { mutate: logout, isPending: isLogoutPending } = useLogout();
  const { mutate: withdraw, isPending: isWithdrawPending } = useWithdraw();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const { data: subscriptions = [], isLoading: isSubLoading } = useQuery({
    queryKey: queryKeys.flightAlert.subscriptions,
    queryFn: flightAlertApi.getSubscriptions,
    enabled: !isGuest,
  });

  const [editingCityId, setEditingCityId] = useState<number | null>(null);

  // enabled=true만 필터링 후 대륙별 그룹핑
  const activeSubscriptions = subscriptions.filter((s) => s.enabled);
  const subscriptionsByContinent = CONTINENT_ORDER.reduce<
    Record<string, typeof subscriptions>
  >((acc, continent) => {
    const items = activeSubscriptions.filter(
      (s) => COUNTRY_TO_CONTINENT[s.countryName] === continent,
    );
    if (items.length > 0) acc[continent] = items;
    return acc;
  }, {});
  const displayedCount = Object.values(subscriptionsByContinent).reduce(
    (sum, items) => sum + items.length,
    0,
  );

  const {
    data: memberTags = [],
    isError: isMemberTagsError,
    isLoading: isMemberTagsLoading,
  } = useMemberTags();
  const {
    data: tagList = [],
    isError: isTagListError,
    isLoading: isTagListLoading,
  } = useTagList();
  const isTagLoading = isMemberTagsLoading || isTagListLoading;
  const isTagError = isMemberTagsError || isTagListError;

  useEffect(() => {
    if (isTagError) {
      toast.error("태그를 불러오지 못했습니다. 페이지를 새로고침 해주세요.");
    }
  }, [isTagError]);

  // 저장된 tagId → 태그명 변환
  const savedTagIds = memberTags.map((t) => t.tagId);
  const savedTagNames = tagList
    .filter((t) => savedTagIds.includes(t.tagId))
    .map((t) => t.tagName);

  // YouTube 연동 상태 (서버에서 조회)
  const {
    data: syncStatus,
    isLoading: isSyncLoading,
    isError: isSyncError,
  } = useQuery({
    queryKey: ["youtube", "sync-status"],
    queryFn: youtubeApi.getSyncStatus,
  });
  // 계정 자체가 OAuth 연결되어 있는지
  const isYoutubeAccountLinked = syncStatus?.connected ?? false;
  // 계정 연결 + syncEnabled 활성 상태
  const youtubeConnected =
    isYoutubeAccountLinked && syncStatus?.syncEnabled !== false;

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
      youtubeApi
        .updateSyncPreference(false)
        .then(() =>
          queryClient.invalidateQueries({
            queryKey: ["youtube", "sync-status"],
          }),
        )
        .catch(() =>
          toast.error("YouTube 연동 해제에 실패했습니다. 다시 시도해주세요."),
        );
    } else if (action === "connect" && isYoutubeAccountLinked) {
      // 계정은 연결됐지만 sync만 꺼져 있던 경우 → 재활성화
      youtubeApi
        .updateSyncPreference(true)
        .then(() =>
          queryClient.invalidateQueries({
            queryKey: ["youtube", "sync-status"],
          }),
        )
        .catch(() =>
          toast.error("YouTube 연동에 실패했습니다. 다시 시도해주세요."),
        );
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
              {isGuest ? (
                /* 게스트 프로필 */
                <div className="flex items-center gap-5">
                  <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <UserX className="size-8 text-white/40" />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <h3 className="text-xl font-bold text-white">
                      비로그인 사용자
                    </h3>
                    <p className="text-sm text-white/40">
                      로그인하면 더 많은 기능을 사용할 수 있어요
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void navigate({ to: "/login" })}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                  >
                    <LogIn className="size-4" />
                    <span>로그인</span>
                  </button>
                </div>
              ) : (
                /* 로그인 사용자 프로필 */
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
              )}
            </div>
          </motion.div>

          {/* ── Section 2: 항공권 알림 목록 — 게스트 숨김 ──────────────── */}
          {!isGuest && (
            <motion.div variants={fadeInUp}>
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="size-4 text-white/70" />
                  <h2 className="text-base font-bold text-white">
                    항공권 알림
                  </h2>
                  {displayedCount > 0 && (
                    <span className="ml-auto text-xs text-white/40">
                      총 {displayedCount}개 도시
                    </span>
                  )}
                </div>

                {isSubLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="size-4 animate-spin text-white/40" />
                    <span className="text-sm text-white/40">
                      불러오는 중...
                    </span>
                  </div>
                ) : displayedCount === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <BellOff className="size-8 text-white/20" />
                    <p className="text-sm text-white/40">
                      설정된 항공권 알림이 없습니다
                    </p>
                    <p className="text-xs text-white/25">
                      도시 상세 페이지에서 목표 가격을 설정해보세요
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent [&:hover::-webkit-scrollbar-thumb]:bg-white/20">
                    {Object.entries(subscriptionsByContinent).map(
                      ([continent, items]) => (
                        <div key={continent}>
                          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                            {continent}
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {items.map((sub) => (
                              <FlightAlertItem
                                key={sub.subscriptionId}
                                sub={sub}
                                editingCityId={editingCityId}
                                setEditingCityId={setEditingCityId}
                              />
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Section 3: 나의 여행 태그 ────────────────────────────────── */}
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

              {isTagLoading ? (
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="size-4 animate-spin text-white/40" />
                  <span className="text-sm text-white/40">
                    태그 불러오는 중...
                  </span>
                </div>
              ) : isTagError ? (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="size-4 text-red-400 shrink-0" />
                  <span className="text-sm text-red-300">
                    태그를 불러오지 못했습니다. 다시 시도해주세요.
                  </span>
                </div>
              ) : savedTagNames.length > 0 ? (
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

          {/* ── Section 4: 연결된 계정 — 게스트 숨김 ───────────────────── */}
          {!isGuest && (
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
                  <h2 className="text-base font-bold text-white">
                    연결된 계정
                  </h2>
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
                    {isSyncLoading ? (
                      <span className="flex items-center gap-1 text-xs text-white/40">
                        <Loader2 className="size-3 animate-spin" />
                        Loading...
                      </span>
                    ) : isSyncError ? (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <AlertTriangle className="size-3" />
                        연결 실패
                      </span>
                    ) : youtubeConnected ? (
                      <span className="text-xs font-bold text-teal-400 tracking-widest">
                        CONNECTED
                      </span>
                    ) : null}
                    <Toggle
                      checked={youtubeConnected}
                      onChange={handleYoutubeToggleClick}
                      disabled={isSyncLoading || isSyncError}
                    />
                    <button
                      type="button"
                      onClick={handleYoutubeToggleClick}
                      disabled={isSyncLoading || isSyncError}
                      className={`text-xs font-medium transition-colors disabled:opacity-40 ${youtubeConnected ? "text-white/40 hover:text-white/70" : "text-blue-400 hover:text-blue-300"}`}
                    >
                      {youtubeConnected ? "연결 해제" : "연결하기"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Section 5: 하단 푸터 ─────────────────────────────────────── */}
          <motion.div variants={fadeInUp}>
            <div className="text-center py-4 flex flex-col gap-2">
              {isGuest ? (
                <>
                  <p className="text-xs text-white/30">
                    로그인하면 북마크, 항공권 알림 등 모든 기능을 이용할 수
                    있어요
                  </p>
                  <button
                    type="button"
                    onClick={() => void navigate({ to: "/login" })}
                    className="mx-auto mt-1 flex items-center gap-2 px-6 py-2.5 rounded-full bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-colors"
                  >
                    <LogIn className="size-4" />
                    로그인하기
                  </button>
                </>
              ) : (
                <>
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
                      onClick={() => setWithdrawModalOpen(true)}
                      className="text-red-400 hover:text-red-300 transition-colors font-medium"
                    >
                      회원 탈퇴
                    </button>
                  </div>
                </>
              )}
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

      {/* 회원 탈퇴 확인 모달 */}
      <AnimatePresence>
        {withdrawModalOpen && (
          <WithdrawModal
            onConfirm={() => withdraw()}
            onCancel={() => setWithdrawModalOpen(false)}
            isPending={isWithdrawPending}
          />
        )}
      </AnimatePresence>
    </main>
  );
};

export default MyPage;
