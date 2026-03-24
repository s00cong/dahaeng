import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  TrendingUp,
  Search,
  User,
  MapPin,
  Flag,
  Bell,
  PlaneTakeoff,
  CheckCheck,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useState, useRef, useEffect, useMemo } from "react";
import { useCityList } from "@/hooks/city/useCityList";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import { COUNTRY_NAME_KO } from "@/data/countryNameKo";
import { CITY_NAME_KO } from "@/data/cityNameKo";
import { useFlightAlertUnreadCount } from "@/hooks/flight-alert/useFlightAlertUnreadCount";
import { useFlightAlertNotifications } from "@/hooks/flight-alert/useFlightAlertNotifications";
import { useMarkNotificationRead } from "@/hooks/flight-alert/useMarkNotificationRead";
import dayjs from "@/utils/dayjs";


export function UnifiedNavBar() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const isMain = pathname === "/main";
  const isBookmarksList = pathname === "/bookmarks";
  const isFloating =
    isMain ||
    pathname.startsWith("/bookmarks") ||
    pathname.startsWith("/cost") ||
    pathname.startsWith("/mypage");

  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarkQuery, setBookmarkQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { openRightPanel, isCityModalOpen, setGlobeCountryTarget } =
    useUiStore();
  const { data: cities } = useCityList();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { data: unreadData } = useFlightAlertUnreadCount();
  const { data: notifData } = useFlightAlertNotifications(0);
  const { mutate: markRead } = useMarkNotificationRead();
  const unreadCount = unreadData?.count ?? 0;

  // 북마크 목록 벗어나면 검색어 초기화
  useEffect(() => {
    if (!isBookmarksList) setBookmarkQuery("");
  }, [isBookmarksList]);

  const handleBookmarkQueryChange = (value: string) => {
    setBookmarkQuery(value);
    void navigate({
      to: "/bookmarks",
      search: value.trim() ? { keyword: value.trim() } : {},
      replace: true,
    });
  };

  const citySource = cities ?? [];

  const citySuggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    return citySource.filter((c) => {
      const enName = c.cityName.toLowerCase().replace(/\s+/g, "");
      const koName = (CITY_NAME_KO[c.cityName] ?? "").toLowerCase().replace(/\s+/g, "");
      const koCountry = (COUNTRY_NAME_KO[c.countryName] ?? "").toLowerCase().replace(/\s+/g, "");
      const enCountry = c.countryName.toLowerCase().replace(/\s+/g, "");
      return enName.includes(q) || koName.includes(q) || koCountry.includes(q) || enCountry.includes(q);
    });
  }, [query, citySource]);

  // 나라 목록 (한국어명 → 영어명)
  const countryList = useMemo(
    () => Object.entries(COUNTRY_NAME_KO).map(([en, ko]) => ({ en, ko })),
    [],
  );

  const countrySuggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    return countryList.filter((c) => {
      return c.ko.replace(/\s+/g, "").includes(q) || c.en.toLowerCase().replace(/\s+/g, "").includes(q);
    });
  }, [query, countryList]);

  const hasResults =
    countrySuggestions.length > 0 || citySuggestions.length > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <motion.nav
      initial={{
        borderRadius: 0,
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: "rgba(10,17,40,0.55)",
      }}
      animate={{
        borderRadius: isFloating ? 16 : 0,
        top: isFloating ? 12 : 0,
        left: isFloating ? 12 : 0,
        right: isFloating ? 12 : 0,
        height: isFloating ? 48 : 64,
        backgroundColor: isFloating
          ? "rgba(255,255,255,0.85)"
          : "rgba(10,17,40,0.55)",
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 28,
      }}
      style={{
        position: "fixed",
        zIndex: isCityModalOpen ? -1 : 50,
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: isFloating ? "0 4px 20px rgba(0,0,0,0.08)" : "none",
        borderBottom: isFloating ? "none" : "1px solid rgba(255,255,255,0.1)",
      }}
      className="flex items-center px-5"
      aria-label="네비게이션"
    >
      <div className="flex items-center justify-between w-full h-full">
        {/* 로고 */}
        <Link
          to="/main"
          search={{ tab: "recommend" }}
          className={cn(
            "flex items-center gap-2 no-underline font-bold text-lg tracking-tight transition-colors duration-300",
            isFloating
              ? "text-slate-800 hover:text-blue-600"
              : "text-white hover:text-white/80",
          )}
          aria-label="다행 메인으로 이동"
        >
          <img src="/favicon.png" alt="다행 로고" className="size-6 object-contain" />
          <span>다행</span>
        </Link>

        {/* 검색바 — 북마크 목록 */}
        {isBookmarksList && (
          <div className="hidden md:flex flex-1 mx-4 lg:mx-6 relative max-w-[200px] lg:max-w-[280px] xl:max-w-[320px]">
            <div className="relative w-full">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none z-10"
                color="#334155"
                strokeWidth={2}
              />
              <input
                type="text"
                value={bookmarkQuery}
                onChange={(e) => handleBookmarkQueryChange(e.target.value)}
                placeholder="저장된 제목으로 검색..."
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
              />
            </div>
          </div>
        )}

        {/* 검색바 — 메인에서만 표시 */}
        {isMain && (
          <div
            ref={wrapperRef}
            className="hidden md:flex flex-col flex-1 mx-4 lg:mx-6 relative overflow-visible max-w-[200px] lg:max-w-[280px] xl:max-w-[320px]"
          >
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none z-10"
                color="#334155"
                strokeWidth={2}
              />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="도시 또는 국가를 검색하세요..."
                className="w-full pl-9 pr-4 py-1.5 text-sm rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
              />
            </div>
            {searchOpen && hasResults && (
              <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden">
                {countrySuggestions.length > 0 && (
                  <div>
                    <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      나라
                    </p>
                    <ul
                      className={
                        countrySuggestions.length > 5
                          ? "overflow-y-auto max-h-[160px]"
                          : ""
                      }
                    >
                      {countrySuggestions.map((country) => (
                        <li
                          key={country.en}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setGlobeCountryTarget(country.en);
                            setQuery(country.ko);
                            setSearchOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm"
                        >
                          <Flag className="size-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800 truncate flex-1 min-w-0">
                            {country.ko}
                          </span>
                          <span className="text-slate-400 text-xs ml-auto shrink-0 whitespace-nowrap">
                            {country.en}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {citySuggestions.length > 0 && (
                  <div
                    className={
                      countrySuggestions.length > 0
                        ? "border-t border-slate-100"
                        : ""
                    }
                  >
                    <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      도시
                    </p>
                    <ul
                      className={
                        citySuggestions.length > 5
                          ? "overflow-y-auto max-h-[160px]"
                          : ""
                      }
                    >
                      {citySuggestions.map((city) => (
                        <li
                          key={city.cityId}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            openRightPanel(city.cityId, city.imgUrl, {
                              lat: city.latitude,
                              lng: city.longitude,
                            });
                            setQuery(CITY_NAME_KO[city.cityName] ?? city.cityName);
                            setSearchOpen(false);
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm"
                        >
                          <MapPin className="size-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800 flex items-baseline gap-1 min-w-0 flex-1">
                            <span className="truncate">{CITY_NAME_KO[city.cityName] ?? city.cityName}</span>
                            {CITY_NAME_KO[city.cityName] && (
                              <span className="text-[10px] text-slate-400 font-normal shrink-0">{city.cityName}</span>
                            )}
                          </span>
                          <span className="text-slate-400 text-xs ml-auto shrink-0 whitespace-nowrap">
                            {COUNTRY_NAME_KO[city.countryName] ?? city.countryName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 우측 링크 + 사용자 */}
        <div className="flex items-center gap-2">
          {/* 항공권 알림 벨 */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className={cn(
                "relative flex items-center justify-center size-8 rounded-lg transition-all duration-300",
                isFloating
                  ? "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                  : "text-white hover:text-white/80 hover:bg-white/10",
              )}
              aria-label="항공권 알림"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* 알림 드롭다운 */}
            {notifOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <PlaneTakeoff className="size-4 text-blue-500" />
                    <span className="text-sm font-semibold text-slate-800">항공권 알림</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="text-xs text-red-500 font-medium">읽지 않음 {unreadCount}개</span>
                  )}
                </div>

                <ul className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {!notifData?.content.length && (
                    <li className="px-4 py-8 text-center text-sm text-slate-400">
                      알림이 없습니다
                    </li>
                  )}
                  {notifData?.content.map((n) => (
                    <li
                      key={n.notificationId}
                      onClick={() => {
                        if (!n.isRead) markRead(n.notificationId);
                      }}
                      className={cn(
                        "flex gap-3 px-4 py-3 cursor-pointer transition-colors",
                        n.isRead ? "hover:bg-slate-50" : "bg-blue-50/60 hover:bg-blue-50",
                      )}
                    >
                      <div className={cn(
                        "mt-0.5 size-7 rounded-full flex items-center justify-center shrink-0",
                        n.alertType === "TARGET_HIT" ? "bg-emerald-100" : "bg-amber-100",
                      )}>
                        <PlaneTakeoff className={cn(
                          "size-3.5",
                          n.alertType === "TARGET_HIT" ? "text-emerald-600" : "text-amber-600",
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {n.cityName}
                          </span>
                          <span className={cn(
                            "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            n.alertType === "TARGET_HIT"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700",
                          )}>
                            {n.alertType === "TARGET_HIT" ? "목표가 달성" : "근접"}
                          </span>
                          {!n.isRead && (
                            <span className="shrink-0 size-1.5 rounded-full bg-blue-500 ml-auto" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          ₩{n.matchedPrice.toLocaleString("ko-KR")}
                          <span className="text-slate-400 ml-1">
                            (목표 ₩{n.thresholdPrice.toLocaleString("ko-KR")})
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          최가 날짜: {n.nearestMatchDate} · {n.matchedDateCount}개 날짜
                        </p>
                        <p className="text-[10px] text-slate-300 mt-0.5">
                          {dayjs(n.createdAt).format("MM.DD HH:mm")}
                        </p>
                      </div>
                      {n.isRead && (
                        <CheckCheck className="size-3.5 text-slate-300 shrink-0 mt-0.5" />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Link
            to="/bookmarks"
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium no-underline px-2.5 py-1.5 rounded-lg transition-all duration-300",
              isFloating
                ? "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                : "text-white hover:text-white/80 hover:bg-white/10",
            )}
          >
            <Bookmark className="size-4" />
            <span className="hidden sm:inline">북마크</span>
          </Link>

          <Link
            to="/cost"
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium no-underline px-2.5 py-1.5 rounded-lg transition-all duration-300",
              isFloating
                ? "text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                : "text-white hover:text-white/80 hover:bg-white/10",
            )}
          >
            <TrendingUp className="size-4" />
            <span className="hidden sm:inline">물가</span>
          </Link>

          <Link
            to="/mypage"
            className={cn(
              "flex items-center justify-center size-8 rounded-full overflow-hidden border-2 transition-colors duration-300 no-underline",
              isFloating
                ? "border-slate-200 hover:border-blue-400"
                : "border-white/30 hover:border-white/60",
            )}
            aria-label="마이페이지로 이동"
          >
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.nickname ?? "사용자"}
                className="size-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User
                className={cn(
                  "size-4 transition-colors duration-300",
                  isFloating ? "text-slate-500" : "text-white",
                )}
              />
            )}
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
