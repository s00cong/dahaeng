import { createFileRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  type LucideIcon,
  Globe, TrendingDown, Plane, ArrowRight, Sparkles, Star, Zap, Loader2, Bot, FlaskConical,
} from 'lucide-react';
import TopNavBar from '@/components/layout/TopNavBar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { useGoogleLogin } from '@/hooks/auth/useGoogleLogin';
import { useAuthStore } from '@/stores/authStore';
import introBg from '@/assets/treesky2.jpg';
import nukiImg from '@/assets/AIDrawing_260308_d2d848f3-0f64-44a7-acfa-d2cf92266ef6_0_MiriCanvas.png';
import maldiveImg from '@/assets/Maldive_beach_1.jpg';

// ─── Types ────────────────────────────────────────────────────────
type Phase = 'intro' | 'leaving' | 'login';

// ─── Intro 애니메이션 variants ────────────────────────────────────
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

// ─── Intro 데이터 ─────────────────────────────────────────────────
const INTRO_FEATURES = [
  {
    icon: Globe,
    title: 'AI 여행 추천',
    description: '취향과 예산에 맞는 여행지를 AI가 분석해 3D 글로브로 시각화합니다.',
    accentColor: '#ffe8e8',
    glowColor: 'rgba(59,130,246,0.3)',
    tag: 'AI 기반',
  },
  {
    icon: TrendingDown,
    title: '실시간 물가 비교',
    description: '세계 주요 도시의 생활 물가를 실시간으로 비교해 여행 예산을 정확히 수립하세요.',
    accentColor: '#fff5e6',
    glowColor: 'rgba(16,185,129,0.3)',
    tag: '실시간',
  },
  {
    icon: Plane,
    title: '항공권 최저가',
    description: '출발일과 목적지를 선택하면 최저가 항공권을 즉시 비교해 드립니다.',
    accentColor: '#fdffe3',
    glowColor: 'rgba(139,92,246,0.3)',
    tag: '최저가 보장',
  },
] as const;

const STATS = [
  { value: '180+', label: '지원 국가' },
  { value: '50K+', label: '활성 사용자' },
  { value: '99%', label: '고객 만족도' },
] as const;

// ─── Login 데이터 ─────────────────────────────────────────────────
const LOGIN_FEATURES = [
  {
    icon: Zap,
    title: '빠르고 간편함',
    description: 'Google 계정 하나로 가입과 로그인을 한 번에 완료하세요.',
    accent: 'text-amber-500',
    bg: 'bg-amber-50',
  },
  {
    icon: Bot,
    title: '실시간 도우미',
    description: 'AI 여행 도우미가 최적의 일정을 실시간으로 제안합니다.',
    accent: 'text-blue-500',
    bg: 'bg-blue-50',
  },
] as const;

const DUMMY_AVATARS = [
  { id: 1, bg: 'bg-blue-400', initial: 'K' },
  { id: 2, bg: 'bg-emerald-400', initial: 'J' },
  { id: 3, bg: 'bg-violet-400', initial: 'M' },
];

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

const IntroFeatureCard = ({ icon: Icon, title, description, accentColor, glowColor, tag, index }: IntroFeatureCardProps) => (
  <motion.div
    variants={scaleIn}
    custom={index}
    whileHover={{ y: -6, transition: { duration: 0.25 } }}
    className="group relative h-full"
    style={{ animationDelay: `${index * 0.1}s` }}
  >
    <div
      className="relative h-full rounded-3xl p-px overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)' }}
    >
      <div
        className="absolute inset-0 rounded-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${accentColor}40, transparent 60%)` }}
        aria-hidden="true"
      />
      <div
        className="relative h-full rounded-3xl p-7 flex flex-col gap-5"
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
            style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }}
          >
            {tag}
          </span>
          <Star className="size-3.5 opacity-0 group-hover:opacity-60 transition-opacity duration-300" style={{ color: accentColor }} aria-hidden="true" />
        </div>
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
          style={{ background: `linear-gradient(135deg, ${accentColor}25, ${accentColor}10)`, boxShadow: `0 0 20px ${glowColor}, inset 0 1px 0 ${accentColor}30` }}
        >
          <Icon className="size-7" style={{ color: accentColor }} aria-hidden="true" />
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400"
            style={{ background: `radial-gradient(circle at 50% 50%, ${glowColor}, transparent 70%)` }}
            aria-hidden="true"
          />
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-white leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
          <span style={{ color: accentColor }}>자세히 보기</span>
          <ArrowRight className="size-3" style={{ color: accentColor }} aria-hidden="true" />
        </div>
      </div>
    </div>
  </motion.div>
);

// ─── Login 서브 컴포넌트 ──────────────────────────────────────────
interface GoogleLoginButtonProps {
  onClick: () => void;
  isPending: boolean;
}

const GoogleLoginButton = ({ onClick, isPending }: GoogleLoginButtonProps) => (
  <Button
    onClick={onClick}
    disabled={isPending}
    variant="outline"
    size="lg"
    className="w-full h-12 gap-3 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium text-sm shadow-sm"
    aria-label="Google 계정으로 로그인"
  >
    {isPending ? (
      <Loader2 className="size-5 animate-spin text-gray-500" aria-hidden="true" />
    ) : (
      <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true" role="img">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    )}
    <span>{isPending ? '이동 중...' : 'Google 계정으로 계속하기'}</span>
  </Button>
);

interface LoginFeatureItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  bg: string;
}

const LoginFeatureItem = ({ icon: Icon, title, description, accent, bg }: LoginFeatureItemProps) => (
  <div className="flex flex-col gap-2 p-4 rounded-xl border border-gray-100 bg-white shadow-xs">
    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
      <Icon className={`size-4 ${accent}`} aria-hidden="true" />
    </div>
    <p className="text-sm font-semibold text-gray-800">{title}</p>
    <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
  </div>
);

const AvatarGroup = () => (
  <div className="flex items-center gap-3">
    <div className="flex -space-x-2" aria-label="함께하는 여행자들">
      {DUMMY_AVATARS.map((avatar) => (
        <div
          key={avatar.id}
          className={`w-8 h-8 rounded-full ${avatar.bg} border-2 border-white flex items-center justify-center text-white text-xs font-semibold`}
          aria-hidden="true"
        >
          {avatar.initial}
        </div>
      ))}
    </div>
    <p className="text-sm text-white/90 font-medium">10,000+ 여행자와 함께</p>
  </div>
);

const RightImagePanel = () => (
  <div className="relative h-full min-h-[280px] lg:min-h-0 overflow-hidden">
    <img
      src={maldiveImg}
      alt="말디브 해변 — 프리미엄 여행지"
      className="absolute inset-0 w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" aria-hidden="true" />
    <div className="absolute inset-0 flex flex-col justify-between p-8">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 text-xs font-medium text-white">
          ✦ 프리미엄 여행 플래너
        </span>
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white leading-snug">프리미엄 여행의 시작</h2>
          <p className="mt-2 text-sm text-white/80">예산과 취향에 맞는 완벽한 여행지를 설계하세요.</p>
        </div>
        <AvatarGroup />
      </div>
    </div>
  </div>
);

// ─── LoginCardContent ─────────────────────────────────────────────
// hooks를 여기서 호출 (항상 마운트되어 있음)
const LoginCardContent = () => {
  const { mutate: loginWithGoogle, isPending } = useGoogleLogin();
  const { setAccessToken, setUser, setHasCompletedPreference } = useAuthStore();
  const navigate = useNavigate();

  const handleDevLogin = () => {
    setAccessToken('dev-mock-token');
    setUser({ id: 1, email: 'dev@dahaeng.com', role: 'USER', nickname: '개발자', profileImageUrl: '' });
    setHasCompletedPreference(true);
    navigate({ to: '/main' });
  };

  return (
    <>
      {/* 좌측 패널 */}
      <div className="flex flex-col w-full lg:w-[52%] px-8 sm:px-10 lg:px-12 py-5 lg:py-7">
        <div className="mb-5">
          <a
            href="/"
            className="text-2xl font-bold text-gray-900 no-underline hover:text-gray-700 transition-colors"
            aria-label="다행 홈으로 이동"
          >
            다행
          </a>
        </div>
        <div className="flex-1 flex flex-col justify-center max-w-md">
          <div className="mb-5">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
              다음 여행을<br />계획해 보세요.
            </h1>
            <p className="mt-3 text-base text-gray-500">다행과 함께 당신만의 여행을 설계하세요</p>
          </div>

          <div className="mb-3">
            <GoogleLoginButton onClick={() => loginWithGoogle()} isPending={isPending} />
          </div>

          {import.meta.env.DEV && (
            <div className="mb-6">
              <Button
                onClick={handleDevLogin}
                variant="outline"
                size="lg"
                className="w-full h-10 gap-2 border-dashed border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-medium"
              >
                <FlaskConical className="size-4" aria-hidden="true" />
                개발 모드로 입장 (백엔드 없이)
              </Button>
            </div>
          )}

          <div className="relative flex items-center gap-4 mb-6" aria-hidden="true">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">또는</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {LOGIN_FEATURES.map((feature) => (
              <LoginFeatureItem key={feature.title} {...feature} />
            ))}
          </div>

          <p className="mt-5 text-xs text-gray-400 leading-relaxed">
            로그인하면 다행의{' '}
            <a href="#" className="underline hover:text-gray-600 transition-colors">서비스 이용약관</a>{' '}
            및{' '}
            <a href="#" className="underline hover:text-gray-600 transition-colors">개인정보처리방침</a>
            에 동의하게 됩니다.
            <br />
            &copy; 2026 다행. All rights reserved.
          </p>
        </div>

        
      </div>

      {/* 우측 패널 */}
      <div className="hidden lg:block lg:w-[48%]">
        <RightImagePanel />
      </div>
    </>
  );
};

// ─── AuthLayout ───────────────────────────────────────────────────
const AuthLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState<Phase>(() =>
    location.pathname === '/login' ? 'login' : 'intro'
  );

  const NUKI_INTRO_LEFT = -280;
  const nukiFlyX = typeof window !== 'undefined' ? window.innerWidth + 600 : 2400;

  // 브라우저 뒤로가기 등 URL 변경 시 phase 동기화
  useEffect(() => {
    if (location.pathname === '/' && phase !== 'intro') setPhase('intro');
    else if (location.pathname === '/login' && phase === 'intro') setPhase('login');
  }, [location.pathname]);

  // login phase일 때 body 스크롤 차단
  useEffect(() => {
    document.body.style.overflow = phase === 'login' ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [phase]);

  const handleGoToLogin = () => {
    if (phase !== 'intro') return;
    const scrollDelay = window.scrollY > 0 ? 500 : 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setPhase('leaving');
      setTimeout(() => {
        setPhase('login');
        navigate({ to: '/login' });
      }, 1200);
    }, scrollDelay);
  };

  const isIntro = phase === 'intro';
  const isLeaving = phase === 'leaving';
  const isLogin = phase === 'login';


  return (
    <div className="min-h-screen flex flex-col relative w-full bg-transparent overflow-hidden" style={{ zIndex: 0 }}>
      {/* Background — position:fixed 별도 div로 background-attachment:fixed 대체.
          fixed bg는 브라우저가 합성 레이어 분리를 못해 CSS transform 애니메이션이
          메인 스레드 repaint를 유발하므로 제거함. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: `url(${introBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: -2,
        }}
      />


      <div className="relative z-10 flex flex-col min-h-screen">
        <TopNavBar />

        {/* ── Intro 콘텐츠 ── */}
        <motion.main
          className="flex-1 w-full"
          animate={!isIntro ? { opacity: 0 } : { opacity: 1 }}
          transition={!isIntro ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
          style={{ pointerEvents: !isIntro ? 'none' : 'auto' }}
        >
          {/* Hero 섹션 */}
          <section
            className="relative w-full overflow-hidden flex flex-col justify-center"
            aria-labelledby="hero-headline"
            style={{ minHeight: '100vh' }}
          >
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
                `,
                backgroundSize: '80px 80px',
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
                        background: 'rgba(59,130,246,0.12)',
                        border: '1px solid rgba(255,255,255,0.6)',
                        color: '#ffffff',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                      }}
                    >
                      <Sparkles className="size-4" aria-hidden="true" />
                      AI 기반 맞춤 여행 플래너
                      <Zap className="size-3.5 text-yellow-400" aria-hidden="true" />
                    </span>
                  </motion.div>

                  <motion.div
                    variants={fadeInUp}
                    className="p-7 sm:p-10 rounded-[2.5rem] flex flex-col gap-6 backdrop-blur-xl group"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1.5px solid rgba(255,255,255,0.12)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 20px 50px rgba(0,0,0,0.2)',
                      maxWidth: 'fit-content',
                    }}
                  >
                    <h1
                      id="hero-headline"
                      className="font-black leading-[1.1] tracking-tighter"
                      style={{ fontSize: 'clamp(2.4rem, 5vw, 4.8rem)', color: '#ffffff' }}
                    >
                      다음 여행을{' '}
                      <span
                        style={{
                          backgroundImage: 'linear-gradient(135deg, #fde047 0%, #f97316 50%, #e11d48 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        행복하게
                      </span>
                      <br />
                      <span className="text-white/90 font-extrabold" style={{ fontSize: '55%' }}>
                        스마트하고 완벽하게 설계하세요
                      </span>
                    </h1>
                    <p
                      className="text-slate-200 font-bold leading-relaxed"
                      style={{ fontSize: 'clamp(1rem, 1.25vw, 1.25rem)', maxWidth: '540px' }}
                    >
                      AI가 추천하는 맞춤 여행지를 3D 글로브로 탐색하고,
                      실시간 물가 비교와 항공권 최저가로{' '}
                      <span className="text-white font-black underline decoration-f97316/50 underline-offset-4">완벽한 여행</span>을 설계하세요.
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
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #e11d48 100%)',
                        color: '#ffffff',
                        boxShadow: '0 8px 32px rgba(234,88,12,0.4), 0 2px 8px rgba(0,0,0,0.3)',
                        minWidth: '200px',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #f43f5e 100%)' }}
                        aria-hidden="true"
                      />
                      <span className="relative">지금 시작하기</span>
                      <ArrowRight className="relative size-5 group-hover:translate-x-1 transition-transform duration-200" aria-hidden="true" />
                    </button>

                    <a
                      href="#features"
                      className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base no-underline"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1.5px solid rgba(255,255,255,0.15)',
                        color: '#e2e8f0',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        minWidth: '200px',
                        justifyContent: 'center',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                        transition: 'all 0.25s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
                        (e.currentTarget as HTMLElement).style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
                        (e.currentTarget as HTMLElement).style.color = '#e2e8f0';
                      }}
                    >
                      서비스 소개 보기
                    </a>
                  </motion.div>

                  <motion.div variants={fadeInUp} className="flex items-center justify-end gap-8 pt-2">
                    {STATS.map((stat) => (
                      <div key={stat.label} className="flex flex-col gap-0.5">
                        <span className="text-2xl font-black text-white tracking-tight">{stat.value}</span>
                        <span className="text-xs text-white font-medium uppercase tracking-wider">{stat.label}</span>
                      </div>
                    ))}
                  </motion.div>
                </motion.div>

              </div>
            </div>
          </section>

          {/* Feature 섹션 */}
          <section id="features" className="relative w-full overflow-hidden" aria-labelledby="features-headline">
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
                `,
                backgroundSize: '80px 80px',
              }}
              aria-hidden="true"
            />
            <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-24 sm:py-32">
              <div className="grid grid-cols-12 gap-4">
                <motion.div
                  className="col-span-12 lg:col-span-8 lg:col-start-3 text-center flex flex-col gap-4 mb-16"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6 }}
                >
                  <span
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest self-center"
                    style={{ background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.3)', color: '#ffffff' }}
                  >
                    <Sparkles className="size-3" aria-hidden="true" />
                    핵심 기능
                  </span>
                  <h2
                    id="features-headline"
                    className="font-black text-white tracking-tight"
                    style={{ fontSize: 'clamp(2rem, 3.5vw, 3.5rem)' }}
                  >
                    왜{' '}
                    <span style={{ backgroundImage: 'linear-gradient(135deg, #fde047, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      다행
                    </span>
                    인가요?
                  </h2>
                  <p className="text-white leading-relaxed" style={{ fontSize: 'clamp(1rem, 1.1vw, 1.15rem)' }}>
                    여행 계획의 처음부터 끝까지, 다행이 함께합니다.<br />
                    AI 분석부터 실시간 예약까지 원스톱으로 해결하세요.
                  </p>
                </motion.div>

                <motion.div
                  className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-60px' }}
                >
                  {INTRO_FEATURES.map((feature, idx) => (
                    <IntroFeatureCard key={feature.title} {...feature} index={idx} />
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
                      background: 'rgba(15, 23, 42, 0.7)',
                      backdropFilter: 'blur(40px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 40px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 1px rgba(59,130,246,0.1)',
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(59,130,246,0.08) 0%, transparent 60%)' }}
                      aria-hidden="true"
                    />
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2"
                      style={{ width: '40%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(99,163,250,0.7), transparent)' }}
                      aria-hidden="true"
                    />
                    <div className="relative flex flex-col lg:flex-row items-center justify-between gap-10">
                      <div className="text-center lg:text-left flex flex-col gap-3">
                        <h2 className="font-black text-white tracking-tight" style={{ fontSize: 'clamp(1.8rem, 3vw, 2.8rem)' }}>
                          지금 바로 여행을{' '}
                          <span style={{ backgroundImage: 'linear-gradient(135deg, #fde047, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            시작하세요
                          </span>
                        </h2>
                        <p className="text-slate-400" style={{ fontSize: 'clamp(0.95rem, 1.1vw, 1.1rem)' }}>
                          무료로 가입하고 AI 맞춤 추천을 경험하세요. 카드 등록 없이 바로 시작 가능합니다.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                        <button
                          type="button"
                          onClick={handleGoToLogin}
                          className="group relative inline-flex items-center justify-center gap-2 px-10 py-4 rounded-2xl font-bold text-base overflow-hidden cursor-pointer"
                          style={{
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 60%, #e11d48 100%)',
                            color: '#ffffff',
                            boxShadow: '0 8px 32px rgba(234,88,12,0.45), 0 2px 8px rgba(0,0,0,0.3)',
                            minWidth: '180px',
                          }}
                        >
                          <span
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{ background: 'linear-gradient(135deg, #fb923c 0%, #f97316 60%, #f43f5e 100%)' }}
                            aria-hidden="true"
                          />
                          <span className="relative">무료로 시작하기</span>
                          <ArrowRight className="relative size-4 group-hover:translate-x-1 transition-transform duration-200" aria-hidden="true" />
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
          transition={!isIntro ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
          style={{ pointerEvents: !isIntro ? 'none' : 'auto' }}
        >
          <Footer />
        </motion.div>

        <Outlet />
      </div>

      {/* Nuki — intro 대기, leaving 시 오른쪽으로 날아감 */}
      {!isLogin && (
        <motion.img
          src={nukiImg}
          className="pointer-events-none"
          style={{
            position: 'fixed',
            top: '-100px',
            left: `${NUKI_INTRO_LEFT}px`,
            zIndex: 30,
            willChange: 'transform',
          }}
          animate={isLeaving ? { x: nukiFlyX } : { x: 0 }}
          transition={isLeaving ? { duration: 1.2, ease: [0.4, 0, 1, 1] } : { duration: 0 }}
          alt=""
          aria-hidden="true"
        />
      )}

      {/* ── 로그인 카드: nuki가 다 날아간 뒤 페이드인 ── */}
      {isLogin && (
        <div
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '24px 16px',
            zIndex: 20,
          }}
        >
          <motion.div
            className="relative w-full max-w-[1400px] mx-auto"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col lg:flex-row" style={{ maxHeight: 'calc(100vh - 148px)' }}>
              <LoginCardContent />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute('/_auth/v1')({
  component: AuthLayout,
});
