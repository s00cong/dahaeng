import { useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { useUiStore } from "@/stores/uiStore";
import { useCreateBookmark } from "@/hooks/bookmark/useCreateBookmark";
import { cn } from "@/lib/utils";
import type { CityDetail } from "@/schemas/city.schema";

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

interface BookmarkButtonProps {
  city: CityDetail;
}

function BookmarkButton({ city }: BookmarkButtonProps) {
  const { mutate: createBookmark, isPending } = useCreateBookmark();

  return (
    <button
      onClick={() => createBookmark({ cityId: city.cityId, json: city })}
      disabled={isPending}
      aria-label="저장하기"
      className={cn(
        "w-14 h-14 rounded-full border-[3px] bg-blue-500/20",
        "flex items-center justify-center shrink-0",
        "active:scale-95 transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60",
        "border-blue-400/80 hover:bg-blue-500/40",
        isPending && "opacity-70 cursor-not-allowed",
      )}
    >
      {isPending ? (
        <Loader2 className="size-5 text-white animate-spin" />
      ) : (
        <Heart className="size-5 text-white" />
      )}
    </button>
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
    <div className="flex flex-wrap gap-2">
      {keywords.map((keyword) => {
        const Icon = getKeywordIcon(keyword);
        return (
          <span
            key={keyword}
            className="flex items-center gap-1.5 backdrop-blur-md bg-white/10 border border-white/20 rounded-full px-3 py-1.5"
          >
            <Icon className="size-4 text-white/80 shrink-0" />
            <span className="text-sm font-medium text-white">#{keyword}</span>
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
  const { closeCityModal } = useUiStore();

  // tagScore 내림차순 정렬 후 상위 10개
  const displayKeywords = city.tags
    ? [...city.tags]
        .sort((a, b) => (b.tagScore ?? 0) - (a.tagScore ?? 0))
        .slice(0, 10)
        .map((t) => t.name)
    : [];

  return (
    <div
      className={cn(
        "relative flex flex-col w-48 sm:w-72 lg:w-90 shrink-0 overflow-hidden rounded-l-2xl",
        className,
      )}
    >
      {/* Background image */}
      {!imgError ? (
        <img
          src={city.imgUrl}
          alt={city.cityName}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-700 flex items-center justify-center">
          <Landmark className="size-16 text-slate-500" />
        </div>
      )}

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
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 backdrop-blur-md border border-amber-500/40 rounded-xl text-amber-200"
          >
            <AlertTriangle className="size-4 shrink-0 text-amber-400" />
            <span className="text-xs font-bold leading-tight">
              {city.danger.items.map((item) => item.description).join(' / ')}
            </span>
          </motion.div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom content */}
      <div className="relative z-10 p-6 flex flex-col gap-5">
        {/* City name + subtext */}
        <div>
          <h2 className="text-2xl font-bold text-white leading-tight drop-shadow-md">
            {city.cityName}
          </h2>
          <p className="text-sm text-white/70 mt-1">
            {city.danger?.countryName ?? city.countryName}
          </p>
        </div>

        {/* 매칭 스코어 + 하트 버튼 (추천 도시만) */}
        {city.score?.finalScore !== undefined && city.score.finalScore !== null && (
          <MatchCard score={city.score.finalScore} city={city} />
        )}

        {/* Glassmorphism keyword tags */}
        {displayKeywords.length > 0 && (
          <KeywordTags keywords={displayKeywords} />
        )}
      </div>
    </div>
  );
}
