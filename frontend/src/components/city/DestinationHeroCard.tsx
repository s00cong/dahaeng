import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Loader2,
  Utensils,
  Landmark,
  Trees,
  ShoppingBag,
  Compass,
  BookOpen,
  Tag,
  AlertTriangle,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useCreateBookmark } from "@/hooks/bookmark/useCreateBookmark";
import { useCountryFlagMap, useCountryIdMap } from "@/hooks/country/useCountryFlagMap";
import { useCityList } from "@/hooks/city/useCityList";
import defaultCityImg from "@/assets/no-picture.png";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CityDetail } from "@/schemas/city.schema";
import { CITY_NAME_KO } from "@/data/cityNameKo";
import { COUNTRY_NAME_KO } from "@/data/countryNameKo";
import { useDisplayCityTags } from "@/hooks/city/useDisplayCityTags";

interface DestinationHeroCardProps {
  city: CityDetail;
  className?: string;
}

const KEYWORD_ICON_MAP: Array<{ patterns: string[]; icon: LucideIcon }> = [
  { patterns: ["미식", "음식", "foodie", "food"], icon: Utensils },
  { patterns: ["문화", "예술", "culture", "art"], icon: Landmark },
  { patterns: ["자연", "nature"], icon: Trees },
  { patterns: ["쇼핑", "shopping"], icon: ShoppingBag },
  { patterns: ["낭만", "로맨틱", "romantic", "romance"], icon: Heart },
  { patterns: ["역사", "history", "historical"], icon: BookOpen },
  { patterns: ["모험", "액티비티", "adventure", "activity"], icon: Compass },
];

function getKeywordIcon(keyword: string): LucideIcon {
  const lower = keyword.toLowerCase();
  for (const { patterns, icon } of KEYWORD_ICON_MAP) {
    if (patterns.some((p) => lower.includes(p))) return icon;
  }
  return Tag;
}

function DangerDropdown({
  items,
}: {
  items: { level: string; description: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col bg-amber-500/20 backdrop-blur-md border border-amber-500/40 rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between gap-2 px-3 py-2 text-amber-300 hover:bg-amber-500/10 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wide">
            여행 안전 정보
          </span>
        </div>
        <ChevronDown
          className={`size-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="flex flex-col divide-y divide-white/10 px-3 pb-2.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 py-1.5 first:pt-1 last:pb-0"
            >
              <span
                className={`self-start text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  item.level === "여행금지"
                    ? "bg-red-500/30 text-red-300"
                    : item.level === "출국권고"
                      ? "bg-orange-500/30 text-orange-300"
                      : item.level === "여행자제"
                        ? "bg-amber-500/30 text-amber-300"
                        : "bg-yellow-500/30 text-yellow-300"
                }`}
              >
                {item.level}
              </span>
              {item.description && (
                <p className="text-[11px] text-white/70 leading-relaxed">
                  {item.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

interface BookmarkButtonProps {
  city: CityDetail;
}

function BookmarkButton({ city }: BookmarkButtonProps) {
  const { mutate: createBookmark, isPending } = useCreateBookmark();
  const { selectedCityImgUrl, recommendRequest, bookmarkedCityIds } = useUiStore();
  const isBookmarked = bookmarkedCityIds.includes(city.cityId);
  const [showModal, setShowModal] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  const handleClick = () => {
    if (isBookmarked) {
      toast.error("이미 북마크된 도시입니다. 다른 조건으로 검색해주세요.");
      return;
    }
    setTitleInput("");
    setShowModal(true);
  };

  const handleConfirm = () => {
    if (titleInput.trim().length < 1) return;
    createBookmark({
      cityId: city.cityId,
      recommendId: recommendRequest!.recommendId!,
      json: { ...city, imgUrl: city.imgUrl || selectedCityImgUrl || null },
      title: titleInput.trim(),
    });
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isPending}
        aria-label="저장하기"
        className={cn(
          "w-14 h-14 rounded-full border-[3px]",
          "flex items-center justify-center shrink-0",
          "active:scale-95 transition-all duration-150",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60",
          isBookmarked
            ? "bg-pink-500/80 border-pink-300 cursor-default"
            : "bg-blue-500/20 border-blue-400/80 hover:bg-blue-500/40",
          isPending && "opacity-70 cursor-not-allowed",
        )}
      >
        {isPending ? (
          <Loader2 className="size-5 text-white animate-spin" />
        ) : (
          <Heart className={cn("size-5 text-white", isBookmarked && "fill-white")} />
        )}
      </button>

      {showModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl p-6 w-80 mx-4 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-800">북마크 제목 입력</h3>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="여행 제목을 입력해주세요"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && titleInput.trim().length >= 1) handleConfirm();
                if (e.key === "Escape") setShowModal(false);
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={titleInput.trim().length < 1}
                className="flex-1 h-10 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                저장
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}

interface MatchCardProps {
  score: number;
  city: CityDetail;
}

function MatchCard({ score, city }: MatchCardProps) {
  return (
    <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-xl p-3.5 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-slate-300 uppercase tracking-wider font-medium">
          Your Match
        </span>
        <span className="text-3xl font-bold text-white leading-none">
          {score}%
        </span>
      </div>
      <BookmarkButton city={city} />
    </div>
  );
}

interface KeywordTagsProps {
  keywords: string[];
}

function KeywordTags({ keywords }: KeywordTagsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30">
      {keywords.map((keyword) => {
        const Icon = getKeywordIcon(keyword);
        return (
          <span
            key={keyword}
            className="flex items-center gap-1 backdrop-blur-md bg-white/10 border border-white/20 rounded-full px-2 py-1"
          >
            <Icon className="size-3 text-white/80 shrink-0" />
            <span className="text-xs font-medium text-white">#{keyword}</span>
          </span>
        );
      })}
    </div>
  );
}

export function DestinationHeroCard({
  city,
  className,
}: DestinationHeroCardProps) {
  const [imgError, setImgError] = useState(false);
  const { closeCityModal, selectedCityImgUrl } = useUiStore();
  const { data: flagMap } = useCountryFlagMap();
  const { data: idMap } = useCountryIdMap();
  const { data: cities } = useCityList();
  const countryName = city.danger?.countryName ?? city.countryName;
  const flagUrl = flagMap?.get(countryName);

  const cityMeta = cities?.find((c) => c.cityId === city.cityId);
  const enrichedCity: typeof city = {
    ...city,
    imgUrl: city.imgUrl || selectedCityImgUrl || cityMeta?.imgUrl || "",
    countryName: countryName || cityMeta?.countryName || "",
    countryId: city.countryId || idMap?.get(countryName) || 0,
    latitude: city.latitude || cityMeta?.latitude || 0,
    longitude: city.longitude || cityMeta?.longitude || 0,
  };

  const displayTags = useDisplayCityTags(city.tags ?? undefined);
  const displayKeywords = displayTags.map((t) => t.name);

  return (
    <div
      className={cn(
        "relative flex flex-col w-48 sm:w-72 lg:w-90 shrink-0 overflow-hidden rounded-l-2xl",
        className,
      )}
    >
      {/* Background image */}
      <img
        src={imgError || !(city.imgUrl || selectedCityImgUrl) ? defaultCityImg : (city.imgUrl || selectedCityImgUrl!)}
        alt={city.cityName}
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => setImgError(true)}
      />

      {/* Gradient overlay — stronger at bottom for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

      {/* Top section: Back button & Danger Info */}
      <div className="relative z-10 flex flex-col p-4 gap-3">
        <div className="flex items-start">
          <button
            onClick={closeCityModal}
            aria-label="뒤로 가기"
            className={cn(
              "flex items-center gap-1.5 text-xs text-white/80 hover:text-white",
              "backdrop-blur-md bg-black/20 hover:bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5",
              "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
            )}
          >
            <ArrowLeft className="size-3" />
            뒤로가기
          </button>
        </div>

        {/* Danger Alert Section */}
        {city.danger && city.danger.items.length > 0 && (
          <DangerDropdown items={city.danger.items} />
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom content */}
      <div className="relative z-10 p-6 flex flex-col gap-5">
        {/* City name + subtext */}
        <div>
          <h2 className="text-2xl font-bold text-white leading-tight drop-shadow-md flex items-baseline gap-2">
            {CITY_NAME_KO[city.cityName] ?? city.cityName}
            {CITY_NAME_KO[city.cityName] && (
              <span className="text-sm font-normal text-white/60">{city.cityName}</span>
            )}
          </h2>
          <p className="text-sm text-white/70 mt-1 flex items-center gap-1.5">
            {flagUrl && (
              <img src={flagUrl} alt="" className="h-3.5 w-auto rounded-[2px] object-cover shrink-0" aria-hidden="true" />
            )}
            {COUNTRY_NAME_KO[countryName] ?? countryName}
            {COUNTRY_NAME_KO[countryName] && (
              <span className="text-xs text-white/40">{countryName}</span>
            )}
          </p>
        </div>

        {/* 매칭 스코어 + 하트 버튼 (추천 도시만) */}
        {city.score?.finalScore !== undefined &&
          city.score.finalScore !== null && (
            <MatchCard score={city.score.finalScore} city={enrichedCity} />
          )}

        {/* Glassmorphism keyword tags */}
        {displayKeywords.length > 0 && (
          <KeywordTags keywords={displayKeywords} />
        )}
      </div>
    </div>
  );
}
