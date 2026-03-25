import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, type Variants } from "framer-motion";
import {
  type LucideIcon,
  Globe,
  TrendingDown,
  Plane,
  ArrowRight,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import TopNavBar from "@/components/layout/TopNavBar";
import Footer from "@/components/layout/Footer";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth.api";
import { GlobeLoginBackground } from "@/components/auth/GlobeLoginBackground";
import { useGoogleLogin } from "@/hooks/auth/useGoogleLogin";

// ─── Types ────────────────────────────────────────────────────────
type Phase = "intro" | "leaving" | "login";

// ─── Intro 애니메이션 variants ────────────────────────────────────
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

// ─── Intro 데이터 ─────────────────────────────────────────────────
const INTRO_FEATURES = [
  {
    icon: Globe,
    title: "AI 여행 추천",
    description:
      "취향과 예산에 맞는 여행지를 AI가 분석해 3D 글로브로 시각화합니다.",
    accentColor: "#ffe8e8",
    glowColor: "rgba(59,130,246,0.3)",
    tag: "AI 기반",
  },
  {
    icon: TrendingDown,
    title: "실시간 물가 비교",
    description:
      "세계 주요 도시의 생활 물가를 실시간으로 비교해 여행 예산을 정확히 수립하세요.",
    accentColor: "#fff5e6",
    glowColor: "rgba(16,185,129,0.3)",
    tag: "실시간",
  },
  {
    icon: Plane,
    title: "항공권 최저가",
    description:
      "출발일과 목적지를 선택하면 최저가 항공권을 즉시 비교해 드립니다.",
    accentColor: "#fdffe3",
    glowColor: "rgba(139,92,246,0.3)",
    tag: "최저가 보장",
  },
] as const;

const STATS = [
  { value: "57개국", label: "지원 국가" },
  { value: "188만개", label: "관광지" },
] as const;

// ─── Login 데이터 ─────────────────────────────────────────────────
// ─── Intro 서브 컴포넌트 ──────────────────────────────────────────
interface IntroFeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor: string;
  glowColor: string;
  tag: string;
  index: number;
}

const IntroFeatureCard = ({
  icon: Icon,
  title,
  description,
  accentColor,
  glowColor,
  tag,
  index,
}: IntroFeatureCardProps) => (
  <motion.div
    variants={scaleIn}
    custom={index}
    whileHover={{ y: -6, transition: { duration: 0.25 } }}
    className="group relative h-full"
    style={{ animationDelay: `${index * 0.1}s` }}
  >
    <div
      className="relative h-full rounded-3xl p-px overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
      }}
    >
      <div
        className="absolute inset-0 rounded-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${accentColor}40, transparent 60%)`,
        }}
        aria-hidden="true"
      />
      <div
        className="relative h-full rounded-3xl p-7 flex flex-col gap-5"
        style={{
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
            style={{
              background: `${accentColor}20`,
              color: accentColor,
              border: `1px solid ${accentColor}30`,
            }}
          >
            {tag}
          </span>
          <Star
            className="size-3.5 opacity-0 group-hover:opacity-60 transition-opacity duration-300"
            style={{ color: accentColor }}
            aria-hidden="true"
          />
        </div>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
          style={{
            background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}10)`,
            boxShadow: `0 0 20px ${glowColor}, inset 0 1px 0 ${accentColor}30`,
          }}
        >
          <Icon
            className="size-7"
            style={{ color: accentColor }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${glowColor}, transparent 70%)`,
            }}
            aria-hidden="true"
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-white leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
          <span style={{ color: accentColor }}>자세히 보기</span>
          <ArrowRight
            className="size-3"
            style={{ color: accentColor }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  </motion.div>
);

// ─── LoginCardContent ─────────────────────────────────────────────
// One Tap이 자동으로 뜨지만, 버튼 클릭 시 다시 트리거하는 용도
const LoginCardContent = () => {
  const { mutate: loginWithGoogle, isPending } = useGoogleLogin();
  const { setGuest } = useAuthStore();
  const navigate = useNavigate();

  const handleGuestLogin = () => {
    setGuest();
    void navigate({ to: "/main" });
  };

  return (
    <div style={{
      width: 400,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 44px",
      borderRadius: 28,
      background: "rgba(10, 20, 40, 0.55)",
      backdropFilter: "blur(24px) saturate(160%)",
      WebkitBackdropFilter: "blur(24px) saturate(160%)",
      border: "1px solid rgba(255,255,255,0.15)",
      boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
    }}>
      {/* 내용 전체 너비 */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* 로고 */}
        <div style={{ marginBottom: 20, textAlign: "center" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.25)",
            marginBottom: 12,
          }}>
            <span style={{ fontSize: 22 }}>✈️</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.3px" }}>
            다행
          </h2>
        </div>

        {/* 헤드라인 */}
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.3,
            margin: "0 0 8px",
            letterSpacing: "-0.5px",
          }}>
            다음 여행을 계획해 보세요
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0 }}>
            AI와 함께 나만의 여행을 설계하세요
          </p>
        </div>

        {/* 구글 로그인 버튼 — 클릭 시 구글 팝업 (One Tap 닫은 경우 대비) */}
        <button
          onClick={() => loginWithGoogle()}
          disabled={isPending}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            height: 48,
            borderRadius: 14,
            background: "#fff",
            border: "none",
            cursor: isPending ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 600,
            color: "#1f2937",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            transition: "opacity 0.15s",
            opacity: isPending ? 0.7 : 1,
            marginBottom: 10,
          }}
          aria-label="Google 계정으로 로그인"
        >
          {isPending ? (
            <svg style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#d1d5db" strokeWidth="3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="#6b7280" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {isPending ? "이동 중..." : "Google로 계속하기"}
        </button>

        {/* 로그인 없이 탐험하기 버튼 */}
        <button
          onClick={handleGuestLogin}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            height: 40,
            borderRadius: 14,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            marginBottom: 8,
          }}
        >
          <Globe style={{ width: 15, height: 15 }} />
          로그인 없이 탐험하기
        </button>

        {/* 약관 */}
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center", margin: "10px 0 0", lineHeight: 1.6 }}>
          로그인 시{" "}
          <a href="#" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "underline" }}>이용약관</a>
          {" "}및{" "}
          <a href="#" style={{ color: "rgba(255,255,255,0.55)", textDecoration: "underline" }}>개인정보처리방침</a>
          에 동의합니다
        </p>
      </div>
    </div>
  );
};

// ─── AuthLayout ───────────────────────────────────────────────────
const AuthLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAccessToken, setUser, setHasCompletedPreference } = useAuthStore();

  const [phase, setPhase] = useState<Phase>(() =>
    location.pathname === "/login" ? "login" : "intro",
  );

  // 지구본 줌인 phase (One Tap 성공 시 'zoomIn'으로 전환)
  const [globePhase, setGlobePhase] = useState<'idle' | 'zoomIn'>('idle');
  const nextRouteRef = useRef<'/main' | '/preference'>('/main');

  // 팝업 방식 — AuthCallbackPage가 postMessage로 결과 전달
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { accessToken, user, hasCompletedPreference, nextRoute } = e.data;
        setAccessToken(accessToken);
        setUser(user);
        setHasCompletedPreference(hasCompletedPreference);
        nextRouteRef.current = nextRoute;
        setGlobePhase('zoomIn');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setAccessToken, setUser, setHasCompletedPreference]);

  const [cardOffscreenX] = useState(() => {
    const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
    return -(vw + 420);
  });

  // 브라우저 뒤로가기 등 URL 변경 시 phase 동기화
  useEffect(() => {
    if (location.pathname === "/" && phase !== "intro") {
      setPhase("intro");
    } else if (location.pathname === "/login" && phase === "intro") {
      setPhase("login");
    }
  }, [location.pathname]);

  // login phase일 때 body 스크롤 차단
  useEffect(() => {
    document.body.style.overflow = phase === "login" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase]);

  const handleGoToLogin = () => {
    if (phase !== "intro") return;
    const scrollDelay = window.scrollY > 0 ? 500 : 0;
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      setPhase("leaving");
      setTimeout(() => {
        setPhase("login");
        navigate({ to: "/login" });
      }, 1500);
    }, scrollDelay);
  };

  const isIntro = phase === "intro";
  const isLeaving = phase === "leaving";
  const isLogin = phase === "login";

  return (
    <div
      className="min-h-screen flex flex-col relative w-full bg-transparent"
      style={{ zIndex: 0 }}
    >
      {/* 지구본 배경 — zoomIn 시 전면으로 올라와 화면 전체 덮음 */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: globePhase === 'zoomIn' ? 50 : -1,
          width: "100vw",
          height: "100vh",
        }}
      >
        <GlobeLoginBackground
          phase={globePhase}
          onAnimationEnd={() => navigate({ to: nextRouteRef.current })}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <TopNavBar />

        {/* ── Intro 콘텐츠 ── */}
        <motion.main
          className="flex-1 w-full"
          animate={!isIntro ? { opacity: 0 } : { opacity: 1 }}
          transition={
            !isIntro ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }
          }
          style={{ pointerEvents: !isIntro ? "none" : "auto" }}
        >
          {/* Hero 섹션 */}
          <section
            className="relative w-full overflow-hidden flex flex-col justify-center"
            aria-labelledby="hero-headline"
            style={{ minHeight: "100vh" }}
          >
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
                `,
                backgroundSize: "80px 80px",
              }}
              aria-hidden="true"
            />

            <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 pt-20 pb-12 sm:pt-24 sm:pb-16 lg:pt-28 lg:pb-20">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* 우측 콘텐츠 */}
                <motion.div
                  className="col-span-12 lg:col-span-7 lg:col-start-6 flex flex-col gap-8 items-end text-right"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  <motion.div variants={fadeInUp}>
                    <span
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                      style={{
                        background: "rgba(59,130,246,0.12)",
                        border: "1px solid rgba(255,255,255,0.6)",
                        color: "#ffffff",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                      }}
                    >
                      <Sparkles className="size-4" aria-hidden="true" />
                      AI 기반 맞춤 여행 플래너
                      <Zap
                        className="size-3.5 text-yellow-400"
                        aria-hidden="true"
                      />
                    </span>
                  </motion.div>

                  <motion.div
                    variants={fadeInUp}
                    className="p-7 sm:p-10 rounded-[2.5rem] flex flex-col gap-6 backdrop-blur-xl group"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1.5px solid rgba(255,255,255,0.12)",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.1), 0 20px 50px rgba(0,0,0,0.2)",
                      maxWidth: "fit-content",
                    }}
                  >
                    <h1
                      id="hero-headline"
                      className="font-black leading-[1.1] tracking-tighter"
                      style={{
                        fontSize: "clamp(2.4rem, 5vw, 4.8rem)",
                        color: "#ffffff",
                      }}
                    >
                      다음 여행을{" "}
                      <span
                        style={{
                          backgroundImage:
                            "linear-gradient(135deg, #fde047 0%, #f97316 50%, #e11d48 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        행복하게
                      </span>
                      <br />
                      <span
                        className="text-white/90 font-extrabold"
                        style={{ fontSize: "55%" }}
                      >
                        스마트하고 완벽하게 설계하세요
                      </span>
                    </h1>
                    <p
                      className="text-slate-200 font-bold leading-relaxed"
                      style={{
                        fontSize: "clamp(1rem, 1.25vw, 1.25rem)",
                        maxWidth: "540px",
                      }}
                    >
                      AI가 추천하는 맞춤 여행지를 지도로 탐색하고, 실시간
                      물가 비교와 항공권 최저가로{" "}
                      <span className="text-white font-black underline decoration-f97316/50 underline-offset-4">
                        완벽한 여행
                      </span>
                      을 설계하세요.
                    </p>
                  </motion.div>

                  <motion.div
                    variants={fadeInUp}
                    className="flex flex-col sm:flex-row items-end sm:items-center gap-4 pt-2"
                  >
                    <button
                      type="button"
                      onClick={handleGoToLogin}
                      className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base overflow-hidden cursor-pointer"
                      style={{
                        background:
                          "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #e11d48 100%)",
                        color: "#ffffff",
                        boxShadow:
                          "0 8px 32px rgba(234,88,12,0.4), 0 2px 8px rgba(0,0,0,0.3)",
                        minWidth: "200px",
                        justifyContent: "center",
                      }}
                    >
                      <span
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background:
                            "linear-gradient(135deg, #fb923c 0%, #f97316 50%, #f43f5e 100%)",
                        }}
                        aria-hidden="true"
                      />
                      <span className="relative">지금 시작하기</span>
                      <ArrowRight
                        className="relative size-5 group-hover:translate-x-1 transition-transform duration-200"
                        aria-hidden="true"
                      />
                    </button>

                    <a
                      href="#features"
                      className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base no-underline"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: "1.5px solid rgba(255,255,255,0.15)",
                        color: "#e2e8f0",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        minWidth: "200px",
                        justifyContent: "center",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
                        transition: "all 0.25s ease",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(255,255,255,0.12)";
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "rgba(255,255,255,0.3)";
                        (e.currentTarget as HTMLElement).style.color =
                          "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(255,255,255,0.07)";
                        (e.currentTarget as HTMLElement).style.borderColor =
                          "rgba(255,255,255,0.15)";
                        (e.currentTarget as HTMLElement).style.color =
                          "#e2e8f0";
                      }}
                    >
                      서비스 소개 보기
                    </a>
                  </motion.div>

                  <motion.div
                    variants={fadeInUp}
                    className="flex items-center justify-end gap-8 pt-2"
                  >
                    {STATS.map((stat) => (
                      <div key={stat.label} className="flex flex-col gap-0.5">
                        <span className="text-2xl font-black text-white tracking-tight">
                          {stat.value}
                        </span>
                        <span className="text-xs text-white font-medium uppercase tracking-wider">
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* Feature 섹션 */}
          <section
            id="features"
            className="relative w-full overflow-hidden"
            aria-labelledby="features-headline"
          >
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
                `,
                backgroundSize: "80px 80px",
              }}
              aria-hidden="true"
            />
            <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-24 sm:py-32">
              <div className="grid grid-cols-12 gap-4">
                <motion.div
                  className="col-span-12 lg:col-span-8 lg:col-start-3 text-center flex flex-col gap-4 mb-16"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6 }}
                >
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest self-center"
                    style={{
                      background: "rgba(255, 255, 255, 0.12)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      color: "#ffffff",
                    }}
                  >
                    <Sparkles className="size-3" aria-hidden="true" />
                    핵심 기능
                  </span>
                  <h2
                    id="features-headline"
                    className="font-black text-white tracking-tight"
                    style={{ fontSize: "clamp(2rem, 3.5vw, 3.5rem)" }}
                  >
                    왜{" "}
                    <span
                      style={{
                        backgroundImage:
                          "linear-gradient(135deg, #fde047, #f97316)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      다행
                    </span>
                    인가요?
                  </h2>
                  <p
                    className="text-white leading-relaxed"
                    style={{ fontSize: "clamp(1rem, 1.1vw, 1.15rem)" }}
                  >
                    여행 계획의 처음부터 끝까지, 다행이 함께합니다.
                    <br />
                    AI 분석부터 실시간 예약까지 원스톱으로 해결하세요.
                  </p>
                </motion.div>

                <motion.div
                  className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                >
                  {INTRO_FEATURES.map((feature, idx) => (
                    <IntroFeatureCard
                      key={feature.title}
                      {...feature}
                      index={idx}
                    />
                  ))}
                </motion.div>
              </div>
            </div>
          </section>

          {/* CTA 배너 섹션 */}
          <section className="relative w-full overflow-hidden py-12">
            <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-24 sm:py-32">
              <div className="grid grid-cols-12 gap-4">
                <motion.div
                  className="col-span-12 lg:col-span-10 lg:col-start-2"
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                >
                  <div
                    className="relative rounded-[2.5rem] p-10 sm:p-14 lg:p-16 overflow-hidden"
                    style={{
                      background: "rgba(15, 23, 42, 0.7)",
                      backdropFilter: "blur(40px) saturate(180%)",
                      WebkitBackdropFilter: "blur(40px) saturate(180%)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      boxShadow:
                        "0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 1px rgba(59,130,246,0.1)",
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(ellipse 60% 80% at 80% 50%, rgba(59,130,246,0.08) 0%, transparent 60%)",
                      }}
                      aria-hidden="true"
                    />
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2"
                      style={{
                        width: "40%",
                        height: "1px",
                        background:
                          "linear-gradient(90deg, transparent, rgba(99,163,250,0.7), transparent)",
                      }}
                      aria-hidden="true"
                    />
                    <div className="relative flex flex-col lg:flex-row items-center justify-between gap-10">
                      <div className="text-center lg:text-left flex flex-col gap-3">
                        <h2
                          className="font-black text-white tracking-tight"
                          style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)" }}
                        >
                          지금 바로 여행을{" "}
                          <span
                            style={{
                              backgroundImage:
                                "linear-gradient(135deg, #fde047, #f97316)",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              backgroundClip: "text",
                            }}
                          >
                            시작하세요
                          </span>
                        </h2>
                        <p
                          className="text-slate-400"
                          style={{ fontSize: "clamp(0.95rem, 1.1vw, 1.1rem)" }}
                        >
                          무료로 가입하고 AI 맞춤 추천을 경험하세요. 카드 등록
                          없이 바로 시작 가능합니다.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                        <button
                          type="button"
                          onClick={handleGoToLogin}
                          className="group relative inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl font-bold text-base overflow-hidden cursor-pointer"
                          style={{
                            background:
                              "linear-gradient(135deg, #f97316 0%, #ea580c 60%, #e11d48 100%)",
                            color: "#ffffff",
                            boxShadow:
                              "0 8px 32px rgba(234,88,12,0.45), 0 2px 8px rgba(0,0,0,0.3)",
                            minWidth: "180px",
                          }}
                        >
                          <span
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{
                              background:
                                "linear-gradient(135deg, #fb923c 0%, #f97316 60%, #f43f5e 100%)",
                            }}
                            aria-hidden="true"
                          />
                          <span className="relative">무료로 시작하기</span>
                          <ArrowRight
                            className="relative size-4 group-hover:translate-x-1 transition-transform duration-200"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </motion.main>

        <motion.div
          animate={!isIntro ? { opacity: 0 } : { opacity: 1 }}
          transition={
            !isIntro ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }
          }
          style={{ pointerEvents: !isIntro ? "none" : "auto" }}
        >
          <Footer />
        </motion.div>

        <Outlet />
      </div>

      {/* ── 날아가는 카드 (leaving 전용): 왼쪽에서 중앙까지 이동 후 정지 ── */}
      {isLeaving && (
        <div
          style={{
            position: "fixed",
            top: "64px",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 19,
            pointerEvents: "none",
          }}
        >
          <motion.div
            initial={{ x: cardOffscreenX }}
            animate={{ x: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <LoginCardContent />
          </motion.div>
        </div>
      )}

      {/* ── 로그인 카드 (login 전용): 로그인 성공 시 페이드아웃 ── */}
      {isLogin && (
        <motion.div
          animate={{
            opacity: globePhase === 'zoomIn' ? 0 : 1,
            scale: globePhase === 'zoomIn' ? 0.92 : 1,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: "fixed",
            top: "64px",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            pointerEvents: globePhase === 'zoomIn' ? 'none' : 'auto',
          }}
        >
          <LoginCardContent />
        </motion.div>
      )}
    </div>
  );
};

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});
