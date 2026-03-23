import { motion, type Variants } from 'framer-motion';
import { type LucideIcon, Loader2, Zap, Bot, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGoogleLogin } from '@/hooks/auth/useGoogleLogin';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth.api';
import { useNavigate } from '@tanstack/react-router';
import maldiveImg from '@/assets/Maldive_beach_1.jpg';
import TopNavBar from '@/components/layout/TopNavBar';
import introBg from '@/assets/treesky.jpg';

// ─── 애니메이션 variants ──────────────────────────────────────────
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  // 카드가 도착(1.3s)한 뒤에 내부 콘텐츠 애니메이션 시작
  visible: { transition: { staggerChildren: 0.08, delayChildren: 1.35 } },
};

// ─── 더미 아바타 데이터 ───────────────────────────────────────────
const DUMMY_AVATARS = [
  { id: 1, bg: 'bg-blue-400', initial: 'K' },
  { id: 2, bg: 'bg-emerald-400', initial: 'J' },
  { id: 3, bg: 'bg-violet-400', initial: 'M' },
];

// ─── 피처 카드 데이터 ─────────────────────────────────────────────
const FEATURES = [
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

// ─── GoogleLoginButton ────────────────────────────────────────────
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
      /* Google G 아이콘 — SVG 인라인 (lucide-react에 없음) */
      <svg
        className="size-5 shrink-0"
        viewBox="0 0 24 24"
        aria-hidden="true"
        role="img"
      >
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    )}
    <span>{isPending ? '이동 중...' : 'Google 계정으로 계속하기'}</span>
  </Button>
);

// ─── FeatureCard ─────────────────────────────────────────────────
interface FeatureItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  bg: string;
}

const FeatureItem = ({ icon: Icon, title, description, accent, bg }: FeatureItemProps) => (
  <div className="flex flex-col gap-2 p-4 rounded-xl border border-gray-100 bg-white shadow-xs">
    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
      <Icon className={`size-4 ${accent}`} aria-hidden="true" />
    </div>
    <p className="text-sm font-semibold text-gray-800">{title}</p>
    <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
  </div>
);

// ─── AvatarGroup ─────────────────────────────────────────────────
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
    <p className="text-sm text-white/90 font-medium">
      10,000+ 여행자와 함께
    </p>
  </div>
);

// ─── RightImagePanel ─────────────────────────────────────────────
const RightImagePanel = () => (
  <div className="relative h-full min-h-[500px] lg:min-h-0 overflow-hidden">
    <img
      src={maldiveImg}
      alt="말디브 해변 — 프리미엄 여행지"
      className="absolute inset-0 w-full h-full object-cover"
    />
    {/* 그라디언트 오버레이 */}
    <div
      className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10"
      aria-hidden="true"
    />
    {/* 오버레이 텍스트 영역 */}
    <div className="absolute inset-0 flex flex-col justify-between p-8">
      {/* 상단 배지 */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1 text-xs font-medium text-white">
          ✦ 프리미엄 여행 플래너
        </span>
      </div>
      {/* 하단 콘텐츠 */}
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white leading-snug">
            프리미엄 여행의 시작
          </h2>
          <p className="mt-2 text-sm text-white/80">
            예산과 취향에 맞는 완벽한 여행지를 설계하세요.
          </p>
        </div>
        <AvatarGroup />
      </div>
    </div>
  </div>
);

// ─── LoginPage ────────────────────────────────────────────────────
const LoginPage = () => {
  const { mutate: loginWithGoogle, isPending } = useGoogleLogin();
  const { setAccessToken, setUser, setHasCompletedPreference } = useAuthStore();
  const navigate = useNavigate();

  const handleDevLogin = async () => {
    const { accessToken, member } = await authApi.devLogin();
    setAccessToken(accessToken);
    setUser(member);
    setHasCompletedPreference(true);
    navigate({ to: '/main' });
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundImage: `url(${introBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >

      <TopNavBar />

      {/* 카드만 좌측하단에서 날아들어옴 */}
      <div className="relative flex-1 flex items-center justify-center px-4 py-10 pt-24" style={{ zIndex: 1 }}>
        <motion.div
          className="w-full max-w-[1400px] mx-auto bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col lg:flex-row min-h-[520px]"
          initial={{ x: -770, y: 640, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.1, ease: [0, 0.2, 0.8, 1] }}
          style={{ willChange: 'transform' }}
        >
          {/* ── 좌측 패널 (로그인 폼) ── */}
          <motion.div
            className="flex flex-col w-full lg:w-[52%] px-8 sm:px-10 lg:px-12 py-8 lg:py-10"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
          {/* 로고 */}
          <motion.div variants={fadeInUp} className="mb-10">
            <a
              href="/"
              className="text-2xl font-bold text-gray-900 no-underline hover:text-gray-700 transition-colors"
              aria-label="다행 홈으로 이동"
            >
              다행
            </a>
          </motion.div>

            {/* 메인 콘텐츠 — 수직 중앙 배치 */}
            <div className="flex-1 flex flex-col justify-center max-w-md">
            {/* 헤드라인 */}
            <motion.div variants={fadeInUp} className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                다음 여행을
                <br />
                계획해 보세요.
              </h1>
              <p className="mt-3 text-base text-gray-500">
                다행과 함께 당신만의 여행을 설계하세요
              </p>
            </motion.div>

            {/* Google 로그인 버튼 */}
            <motion.div variants={fadeInUp} className="mb-3">
              <GoogleLoginButton
                onClick={() => loginWithGoogle()}
                isPending={isPending}
              />
            </motion.div>

            {/* 개발 모드 버튼 (백엔드 없이 UI 확인용) */}
            {import.meta.env.DEV && (
              <motion.div variants={fadeInUp} className="mb-6">
                <Button
                  onClick={handleDevLogin}
                  variant="outline"
                  size="lg"
                  className="w-full h-10 gap-2 border-dashed border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-medium"
                >
                  <FlaskConical className="size-4" aria-hidden="true" />
                  개발 모드로 입장 (백엔드 없이)
                </Button>
              </motion.div>
            )}

            {/* 구분선 */}
            <motion.div
              variants={fadeInUp}
              className="relative flex items-center gap-4 mb-6"
              aria-hidden="true"
            >
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">또는</span>
              <div className="flex-1 h-px bg-gray-200" />
            </motion.div>

            {/* Feature 카드 2열 */}
            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-2 gap-3"
            >
              {FEATURES.map((feature) => (
                <motion.div key={feature.title} variants={fadeInUp}>
                  <FeatureItem {...feature} />
                </motion.div>
              ))}
            </motion.div>

              {/* 하단 약관 텍스트 */}
              <motion.p
                variants={fadeInUp}
                className="mt-8 text-xs text-gray-400 leading-relaxed"
              >
                로그인하면 다행의{' '}
                <a href="#" className="underline hover:text-gray-600 transition-colors">
                  서비스 이용약관
                </a>{' '}
                및{' '}
                <a href="#" className="underline hover:text-gray-600 transition-colors">
                  개인정보처리방침
                </a>
                에 동의하게 됩니다.
              </motion.p>
            </div>

            {/* 푸터 */}
            <motion.p
              variants={fadeInUp}
              className="mt-auto pt-8 text-xs text-gray-400"
            >
              &copy; 2026 다행. All rights reserved.
            </motion.p>
          </motion.div>

          {/* ── 우측 패널 (이미지) ── */}
          <div className="hidden lg:block lg:w-[48%]">
            <RightImagePanel />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
