import { Link } from "@tanstack/react-router";
import {
  Globe2,
  Bookmark,
  TrendingUp,
  Search,
  User,
  MapPin,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useLogout } from "@/hooks/auth/useLogout";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useMemo } from "react";
import { useCityList } from "@/hooks/city/useCityList";
import { useUiStore } from "@/stores/uiStore";
import { DUMMY_CITY_DETAILS } from "@/data/dummyCityData";

export function MainNavBar() {
  const { user } = useAuthStore();
  const { mutate: logout } = useLogout();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { openRightPanel } = useUiStore();
  const { data: cities } = useCityList();

  const fallbackCities = useMemo(() => Object.values(DUMMY_CITY_DETAILS), []);
  const citySource = cities ?? fallbackCities;

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return citySource
      .filter(
        (c) => c.cityName.includes(query) || c.countryName.includes(query),
      )
      .slice(0, 8);
  }, [query, citySource]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav
      className={cn(
        "absolute top-3 left-3 right-3 z-30",
        "bg-white/85 backdrop-blur-md rounded-2xl shadow-lg",
        "flex items-center justify-between px-5 py-2.5 h-12",
      )}
      aria-label="메인 페이지 네비게이션"
    >
      {/* 로고 */}
      <Link
        to="/main"
        search={{ tab: "recommend" }}
        className="flex items-center gap-2 text-slate-800 hover:text-blue-600 transition-colors no-underline"
        aria-label="다행 메인으로 이동"
      >
        <Globe2 className="size-5 text-blue-500" aria-hidden="true" />
        <span className="text-lg font-bold tracking-tight">다행</span>
      </Link>

      {/* 검색 인풋 (더미) */}
      <div
        ref={wrapperRef}
        className="hidden md:flex flex-col flex-1 max-w-sm mx-6 relative"
      >
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="도시 또는 국가를 검색하세요..."
            className={cn(
              "w-full pl-9 pr-4 py-1.5 text-sm rounded-xl border border-slate-200",
              "bg-white/70 backdrop-blur-sm placeholder:text-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400",
              "transition-all",
            )}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-blue-600 pointer-events-none" />
        </div>

        {/* 자동완성 드롭다운 */}
        {open && suggestions.length > 0 && (
          <ul className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden">
            {suggestions.map((city) => (
              <li
                key={city.cityId}
                onMouseDown={() => {
                  openRightPanel(city.cityId, city.imgUrl, {
                    lat: city.latitude,
                    lng: city.longitude,
                  });
                  setQuery(city.cityName);
                  setOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm"
              >
                <MapPin className="size-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-800">
                  {city.cityName}
                </span>
                <span className="text-slate-400 text-xs ml-auto">
                  {city.countryName}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 우측 네비 */}
      <div className="flex items-center gap-2">
        <Link
          to="/bookmarks"
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium text-slate-600",
            "hover:text-blue-600 transition-colors no-underline px-2.5 py-1.5 rounded-lg hover:bg-blue-50",
          )}
          aria-label="북마크 페이지로 이동"
        >
          <Bookmark className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">북마크</span>
        </Link>

        <Link
          to="/cost"
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium text-slate-600",
            "hover:text-blue-600 transition-colors no-underline px-2.5 py-1.5 rounded-lg hover:bg-blue-50",
          )}
          aria-label="물가 페이지로 이동"
        >
          <TrendingUp className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">물가</span>
        </Link>

        {/* 사용자 아바타 */}
        <button
          onClick={() => logout()}
          className={cn(
            "flex items-center justify-center size-8 rounded-full overflow-hidden",
            "border-2 border-slate-200 hover:border-blue-400 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          )}
          aria-label="사용자 메뉴"
        >
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={user.nickname ?? "사용자"}
              className="size-full object-cover"
            />
          ) : (
            <User className="size-4 text-slate-500" aria-hidden="true" />
          )}
        </button>
      </div>
    </nav>
  );
}
