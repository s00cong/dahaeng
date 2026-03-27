import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import introBg from "@/assets/treesky.jpg";
import nukiImg from "@/assets/nuki.png";

// ─── 애니메이션 variants ───────────────────────────────────────────
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

// ─── Feature 카드 데이터 ──────────────────────────────────────────
const FEATURES = [
  {
    icon: Globe,
    title: "AI 여행 추천",
    description:
      "취향과 예산에 맞는 여행지를 AI가 분석해 3D 글로브로 시각화합니다.",
    accentColor: "#3b82f6",
    glowColor: "rgba(59,130,246,0.3)",
    tag: "AI 기반",
  },
  {
    icon: TrendingDown,
    title: "실시간 물가 비교",
    description:
      "세계 주요 도시의 생활 물가를 실시간으로 비교해 여행 예산을 정확히 수립하세요.",
    accentColor: "#10b981",
    glowColor: "rgba(16,185,129,0.3)",
    tag: "실시간",
  },
  {
    icon: Plane,
    title: "항공권 최저가",
    description:
      "출발일과 목적지를 선택하면 최저가 항공권을 즉시 비교해 드립니다.",
    accentColor: "#8b5cf6",
    glowColor: "rgba(139,92,246,0.3)",
    tag: "최저가 보장",
  },
] as const;

// ─── 통계 데이터 ──────────────────────────────────────────────────
const STATS = [
  { value: "180+", label: "지원 국가" },
  { value: "50K+", label: "활성 사용자" },
  { value: "99%", label: "고객 만족도" },
] as const;

// ─── FeatureCard 컴포넌트 ─────────────────────────────────────────
interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor: string;
  glowColor: string;
  tag: string;
  index: number;
}

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  accentColor,
  glowColor,
  tag,
  index,
}: FeatureCardProps) => (
  <motion.div
    variants={scaleIn}
    custom={index}
    whileHover={{ y: -6, transition: { duration: 0.25 } }}
    className="group relative h-full"
    style={{ animationDelay: `${index * 0.1}s` }}
  >
    {/* Liquid Glass 카드 */}
    <div
      className="relative h-full rounded-3xl p-px overflow-hidden"
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)`,
      }}
    >
      {/* 테두리 그라데이션 */}
      <div
        className="absolute inset-0 rounded-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${accentColor}40, transparent 60%)`,
        }}
        aria-hidden="true"
      />

      {/* 카드 본체 */}
      <div
        className="relative h-full rounded-3xl p-7 flex flex-col gap-5"
        style={{
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          boxShadow: `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
      >
        {/* 태그 */}
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

        {/* 아이콘 */}
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
          {/* 글로우 효과 */}
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${glowColor}, transparent 70%)`,
            }}
            aria-hidden="true"
          />
        </div>

        {/* 텍스트 */}
        <div className="flex flex-col gap-2 flex-1">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-sm text-white leading-relaxed">{description}</p>
        </div>

        {/* 하단 화살표 */}
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

// ─── IntroPage ────────────────────────────────────────────────────
const IntroPage = () => {
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);

  const handleGoToLogin = () => {
    setIsLeaving(true);
    setTimeout(() => navigate({ to: "/login" }), 700);
  };

  return (
    <div
      className="min-h-screen flex flex-col relative w-full bg-transparent overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Background Image Layer - 페이지와 함께 스크롤 */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${introBg})`,
          zIndex: -2,
        }}
        aria-hidden="true"
      />
      {/* Nuki 오버레이 - 좌측 상단, 버튼 클릭 시 우측 상단으로 날아감 */}
      <motion.img
        src={nukiImg}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ zIndex: -1 }}
        animate={
          isLeaving ? { x: 770, y: -640, scale: 1.5 } : { x: 0, y: 0, scale: 1 }
        }
        transition={{ duration: 0.65, ease: [0.2, 0, 1, 0.8] }}
        alt=""
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <TopNavBar />

        <motion.main
          className="flex-1 w-full"
          animate={isLeaving ? { opacity: 0, y: -16 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeIn" }}
        >
          {/* ── Hero 섹션 ── */}
          <section
            className="relative w-full overflow-hidden flex flex-col justify-center"
            aria-labelledby="hero-headline"
            style={{ minHeight: "100vh" }}
          >
            {/* 그리드 패턴 오버레이 */}
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

            {/* 12컬럼 그리드 컨테이너 */}
            <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 pt-20 pb-12 sm:pt-24 sm:pb-16 lg:pt-28 lg:pb-20">
              {/* 12컬럼 그리드 */}
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* 왼쪽 콘텐츠: col 1-7 */}
                <motion.div
                  className="col-span-12 lg:col-span-7 flex flex-col gap-8"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {/* 배지 */}
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

                  {/* 헤드라인 및 서브 카피 묶음 (Liquid Glass 적용) */}
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
                    {/* 헤드라인 */}
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

                    {/* 서브 카피 */}
                    <p
                      className="text-slate-200 font-bold leading-relaxed"
                      style={{
                        fontSize: "clamp(1rem, 1.25vw, 1.25rem)",
                        maxWidth: "540px",
                      }}
                    >
                      AI가 추천하는 맞춤 여행지를 3D 글로브로 탐색하고, 실시간
                      물가 비교와 항공권 최저가로{" "}
                      <span className="text-white font-black underline decoration-f97316/50 underline-offset-4">
                        완벽한 여행
                      </span>
                      을 설계하세요.
                    </p>
                  </motion.div>

                  {/* CTA 버튼 그룹 */}
                  <motion.div
                    variants={fadeInUp}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2"
                  >
                    {/* Primary CTA */}
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
                      {/* 호버 글로우 */}
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

                    {/* Secondary CTA */}
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

                  {/* 통계 지표 */}
                  <motion.div
                    variants={fadeInUp}
                    className="flex items-center gap-8 pt-2"
                  >
                    {STATS.map((stat, i) => (
                      <div key={stat.label} className="flex flex-col gap-0.5">
                        <span className="text-2xl font-black text-white tracking-tight">
                          {stat.value}
                        </span>
                        <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                          {stat.label}
                        </span>
                        {i < STATS.length - 1 && (
                          <span className="absolute" aria-hidden="true" />
                        )}
                      </div>
                    ))}
                  </motion.div>
                </motion.div>

                {/* 오른쪽 Liquid Glass 장식 카드: col 9-12 */}
                <motion.div
                  className="col-span-12 lg:col-span-5 flex items-center justify-center lg:justify-end"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                >
                  <div className="relative w-full max-w-sm lg:max-w-md">
                    {/* 배경 글로우 */}
                    <div
                      className="absolute inset-0 rounded-[2rem]"
                      style={{
                        background:
                          "radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.25) 0%, transparent 70%)",
                        filter: "blur(30px)",
                        transform: "scale(1.2)",
                      }}
                      aria-hidden="true"
                    />

                    {/* 메인 Liquid Glass 패널 */}
                    <div
                      className="relative rounded-[2rem] p-6 sm:p-8"
                      style={{
                        background: "rgba(15, 23, 42, 0.55)",
                        backdropFilter:
                          "blur(40px) saturate(200%) brightness(1.1)",
                        WebkitBackdropFilter:
                          "blur(40px) saturate(200%) brightness(1.1)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow: `
                          0 32px 64px rgba(0,0,0,0.5),
                          0 0 0 1px rgba(255,255,255,0.05),
                          inset 0 1px 0 rgba(255,255,255,0.15),
                          inset 0 -1px 0 rgba(0,0,0,0.2)
                        `,
                      }}
                    >
                      {/* 상단 글로우 라인 */}
                      <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                        style={{
                          width: "60%",
                          height: "1px",
                          background:
                            "linear-gradient(90deg, transparent, rgba(99,163,250,0.8), transparent)",
                        }}
                        aria-hidden="true"
                      />

                      {/* 미니 스탯 아이템들 */}
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: "rgba(59,130,246,0.2)" }}
                          >
                            <Globe
                              className="size-4 text-blue-400"
                              aria-hidden="true"
                            />
                          </div>
                          <div>
                            <div className="text-white font-semibold text-sm">
                              AI 여행 분석 중
                            </div>
                            <div className="text-slate-500 text-xs">
                              도쿄 · 파리 · 발리 비교
                            </div>
                          </div>
                        </div>

                        {/* 프로그레스 바들 */}
                        {[
                          { label: "도쿄", value: 88, color: "#3b82f6" },
                          { label: "파리", value: 72, color: "#8b5cf6" },
                          { label: "발리", value: 95, color: "#10b981" },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex flex-col gap-1.5"
                          >
                            <div className="flex justify-between">
                              <span className="text-slate-400 text-xs">
                                {item.label}
                              </span>
                              <span className="text-white text-xs font-bold">
                                {item.value}점
                              </span>
                            </div>
                            <div
                              className="h-2 w-full rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.08)" }}
                            >
                              <motion.div
                                className="h-full rounded-full"
                                style={{
                                  background: `linear-gradient(90deg, ${item.color}, ${item.color}80)`,
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${item.value}%` }}
                                transition={{
                                  duration: 1,
                                  delay: 0.8,
                                  ease: "easeOut",
                                }}
                              />
                            </div>
                          </div>
                        ))}

                        {/* 구분선 */}
                        <div
                          className="my-1"
                          style={{
                            height: "1px",
                            background: "rgba(255,255,255,0.07)",
                          }}
                          aria-hidden="true"
                        />

                        {/* 항공권 최저가 표시 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Plane
                              className="size-4 text-blue-400"
                              aria-hidden="true"
                            />
                            <span className="text-slate-400 text-xs">
                              최저가 항공
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-black text-lg">
                              ₩319,000
                            </span>
                            <div className="text-slate-600 text-xs line-through">
                              ₩485,000
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 플로팅 미니 카드 - 왼쪽 아래 */}
                    <motion.div
                      className="absolute -bottom-4 -left-4 rounded-2xl px-4 py-3"
                      style={{
                        background: "rgba(16,185,129,0.15)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        border: "1px solid rgba(16,185,129,0.25)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                      }}
                      animate={{ y: [0, -6, 0] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <div className="text-emerald-400 font-black text-sm">
                        34% 절약
                      </div>
                      <div className="text-slate-400 text-xs">
                        AI 추천 플랜 기준
                      </div>
                    </motion.div>

                    {/* 플로팅 미니 카드 - 오른쪽 위 */}
                    <motion.div
                      className="absolute -top-4 -right-2 rounded-2xl px-4 py-3"
                      style={{
                        background: "rgba(99,102,241,0.15)",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        border: "1px solid rgba(99,102,241,0.25)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                      }}
                      animate={{ y: [0, 6, 0] }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1,
                      }}
                    >
                      <div className="text-violet-400 font-black text-sm">
                        1,240개
                      </div>
                      <div className="text-slate-400 text-xs">연결 항공편</div>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── Feature 섹션 ── */}
          <section
            id="features"
            className="relative w-full overflow-hidden"
            aria-labelledby="features-headline"
          >
            {/* 배경 장식 */}
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
              {/* 12컬럼 그리드 */}
              <div className="grid grid-cols-12 gap-4">
                {/* 섹션 헤더: 가운데 col 3-10 */}
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
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      color: "#818cf8",
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

                {/* 카드 그리드: 3열 (각 4컬럼) */}
                <motion.div
                  className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                >
                  {FEATURES.map((feature, idx) => (
                    <FeatureCard key={feature.title} {...feature} index={idx} />
                  ))}
                </motion.div>
              </div>
            </div>
          </section>

          {/* ── CTA 배너 섹션 ── */}
          <section className="relative w-full overflow-hidden py-12">
            <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-24 sm:py-32">
              <div className="grid grid-cols-12 gap-4">
                {/* CTA 카드: col 2-11 */}
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
                      boxShadow: `
                      0 40px 80px rgba(0,0,0,0.5),
                      inset 0 1px 0 rgba(255,255,255,0.12),
                      0 0 0 1px rgba(59,130,246,0.1)
                    `,
                    }}
                  >
                    {/* 배경 글로우 */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(ellipse 60% 80% at 80% 50%, rgba(59,130,246,0.08) 0%, transparent 60%)",
                      }}
                      aria-hidden="true"
                    />

                    {/* 상단 글로우 라인 */}
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
          animate={isLeaving ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeIn" }}
        >
          <Footer />
        </motion.div>
      </div>
    </div>
  );
};

export default IntroPage;
