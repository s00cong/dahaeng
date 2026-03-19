import { useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/hooks/auth/useLogout";
import { Button } from "@/components/ui/button";
import {
  type LucideIcon,
  Loader2,
  LogOut,
  User,
  Menu,
  X,
  Globe,
  TrendingDown,
  Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── 모바일 메뉴 애니메이션 variants ──────────────────────────────
const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const drawerVariants: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: "easeIn" as const } },
};

const menuItemVariants: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, delay: i * 0.05, ease: "easeOut" as const },
  }),
};

// ─── 네비게이션 링크 정의 ──────────────────────────────────────────
interface NavLink {
  to: string;
  label: string;
  icon: LucideIcon;
}

const AUTHENTICATED_LINKS: NavLink[] = [
  { to: "/main", label: "메인", icon: Globe },
  { to: "/cost", label: "물가", icon: TrendingDown },
  { to: "/bookmarks", label: "북마크", icon: Bookmark },
];

// ─── TopNavBar ────────────────────────────────────────────────────
const TopNavBar = () => {
  const { user } = useAuthStore();
  const { mutate: logout, isPending } = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    closeMobileMenu();
  }, [logout, closeMobileMenu]);

  return (
    <>
      {/* ── 메인 네비게이션 바 ── */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16 w-full",
          "border-b border-white/10",
          "transition-all duration-150 ease-in-out text-white",
        )}
        style={{
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          backgroundColor: "rgba(10, 17, 40, 0.55)",
        }}
        aria-label="주요 네비게이션"
      >
        <div className="flex items-center justify-between w-full h-full px-4 sm:px-6 lg:px-8">
          {/* 로고 */}
          <Link
            to="/"
            className="text-xl sm:text-2xl font-black !text-white hover:!text-white/80 transition-all no-underline tracking-tighter shrink-0"
            style={{ color: "white", fontWeight: 900 }}
            aria-label="다행 홈으로 이동"
            onClick={closeMobileMenu}
          >
            다행
          </Link>

          {/* 데스크탑 링크 (md 이상) */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {AUTHENTICATED_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-3 py-2 text-sm font-bold !text-white hover:!text-white/80 hover:bg-white/10 rounded-lg transition-all no-underline"
                  style={{ color: "white", fontWeight: 700 }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}

          {/* 데스크탑 우측 액션 영역 (md 이상) */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/mypage"
                  className="p-2 !text-white hover:!text-white/80 hover:bg-white/10 rounded-lg transition-all no-underline flex items-center"
                  style={{ color: "white" }}
                  aria-label="마이페이지"
                >
                  <User className="size-4" aria-hidden="true" />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  disabled={isPending}
                  aria-label="로그아웃"
                  className="text-white hover:text-white/80 hover:bg-white/10 font-bold"
                >
                  {isPending ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <LogOut className="size-4" aria-hidden="true" />
                  )}
                  <span className="hidden lg:inline ml-1 font-semibold">
                    {isPending ? "로그아웃 중..." : "로그아웃"}
                  </span>
                </Button>
              </>
            ) : (
              <Link
                to="/login"
                className="no-underline inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-1.5 text-sm font-bold transition-all hover:bg-white/30"
                style={{
                  color: "white",
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.2)",
                }}
              >
                로그인
              </Link>
            )}
          </div>

          {/* 모바일 햄버거 버튼 (md 미만) */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-white hover:text-white/80 hover:bg-white/10 transition-all"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isMobileMenuOpen ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X className="size-5" aria-hidden="true" />
                </motion.span>
              ) : (
                <motion.span
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Menu className="size-5" aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* ── 모바일 메뉴 오버레이 + 드로어 ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* 반투명 오버레이 */}
            <motion.div
              key="overlay"
              className="fixed inset-0 top-16 z-40 bg-black/60 md:hidden"
              style={{
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />

            {/* 메뉴 패널 */}
            <motion.div
              key="drawer"
              id="mobile-menu"
              className="fixed top-16 left-0 right-0 z-40 md:hidden"
              style={{
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                backgroundColor: "rgba(10, 17, 40, 0.92)",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              }}
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-label="모바일 내비게이션 메뉴"
            >
              <div className="flex flex-col px-4 py-4 gap-1">
                {user ? (
                  <>
                    {/* 인증된 사용자 링크 */}
                    {AUTHENTICATED_LINKS.map((link, i) => {
                      const Icon = link.icon;
                      return (
                        <motion.div
                          key={link.to}
                          variants={menuItemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={i}
                        >
                          <Link
                            to={link.to}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all no-underline font-semibold text-base"
                            onClick={closeMobileMenu}
                          >
                            <Icon
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                            {link.label}
                          </Link>
                        </motion.div>
                      );
                    })}

                    {/* 구분선 */}
                    <motion.div
                      variants={menuItemVariants}
                      initial="hidden"
                      animate="visible"
                      custom={AUTHENTICATED_LINKS.length}
                      className="my-1 border-t border-white/10"
                    />

                    {/* 마이페이지 */}
                    <motion.div
                      variants={menuItemVariants}
                      initial="hidden"
                      animate="visible"
                      custom={AUTHENTICATED_LINKS.length + 1}
                    >
                      <Link
                        to="/mypage"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all no-underline font-semibold text-base"
                        onClick={closeMobileMenu}
                      >
                        <User className="size-4 shrink-0" aria-hidden="true" />
                        마이페이지
                      </Link>
                    </motion.div>

                    {/* 로그아웃 */}
                    <motion.div
                      variants={menuItemVariants}
                      initial="hidden"
                      animate="visible"
                      custom={AUTHENTICATED_LINKS.length + 2}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all font-semibold text-base text-left"
                        onClick={handleLogout}
                        disabled={isPending}
                        aria-label="로그아웃"
                      >
                        {isPending ? (
                          <Loader2
                            className="size-4 shrink-0 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <LogOut
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        {isPending ? "로그아웃 중..." : "로그아웃"}
                      </button>
                    </motion.div>
                  </>
                ) : (
                  /* 비로그인 사용자 */
                  <motion.div
                    variants={menuItemVariants}
                    initial="hidden"
                    animate="visible"
                    custom={0}
                    className="py-2"
                  >
                    <Link
                      to="/login"
                      className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-2xl font-bold text-base no-underline text-white"
                      style={{
                        background:
                          "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #e11d48 100%)",
                        boxShadow: "0 4px 16px rgba(234,88,12,0.35)",
                      }}
                      onClick={closeMobileMenu}
                    >
                      로그인
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default TopNavBar;
