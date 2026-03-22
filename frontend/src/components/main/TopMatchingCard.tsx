import { useState, useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import defaultCityImg from '@/assets/no-picture.png';
import { Badge } from '@/components/ui/badge';
import { useUiStore } from '@/stores/uiStore';
import { useCountryFlagMap } from '@/hooks/country/useCountryFlagMap';
import { cn } from '@/lib/utils';
import { CITY_NAME_KO } from '@/data/cityNameKo';
import { COUNTRY_NAME_KO } from '@/data/countryNameKo';
import type { CityListItem } from '@/schemas/city.schema';

function MarqueeText({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;
    const diff = textEl.scrollWidth - container.clientWidth;
    setDistance(diff > 0 ? diff : 0);
  }, [text]);

  const duration = 2 + distance / 35;

  return (
    <div ref={containerRef} className={cn('overflow-hidden whitespace-nowrap', className)}>
      <motion.span
        ref={textRef}
        style={{ display: 'inline-block' }}
        animate={distance > 0 ? { x: [0, 0, -(distance + 4), -(distance + 4), 0] } : { x: 0 }}
        transition={
          distance > 0
            ? {
                duration,
                times: [0, 0.15, 0.7, 0.85, 1],
                repeat: Infinity,
                ease: 'easeInOut',
              }
            : undefined
        }
      >
        {text}
      </motion.span>
    </div>
  );
}

interface TopMatchingCardProps {
  city: CityListItem;
  rank: number;
}

function getMatchColor(score: number | undefined): string {
  if (score === undefined) return 'bg-slate-100 text-slate-600';
  if (score >= 80) return 'bg-emerald-100 text-emerald-700';
  if (score >= 50) return 'bg-blue-100 text-blue-700';
  return 'bg-amber-100 text-amber-700';
}

export function TopMatchingCard({ city, rank }: TopMatchingCardProps) {
  const { openRightPanel } = useUiStore();
  const { data: flagMap } = useCountryFlagMap();
  const flagUrl = flagMap?.get(city.countryName);
  const [imgError, setImgError] = useState(false);

  const handleClick = useCallback(() => {
    openRightPanel(city.cityId, city.imgUrl, { lat: city.latitude, lng: city.longitude });
  }, [city, openRightPanel]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openRightPanel(city.cityId, city.imgUrl, { lat: city.latitude, lng: city.longitude });
      }
    },
    [city, openRightPanel],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer',
        'hover:bg-white/60 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
      )}
      aria-label={`${city.cityName} 상세 정보 보기`}
    >
      {/* 순위 */}
      <span className="text-xs font-bold text-slate-400 w-4 shrink-0 text-center">
        {rank}
      </span>

      {/* 이미지 아바타 */}
      <div className="size-10 rounded-xl overflow-hidden bg-slate-200 shrink-0">
        <img
          src={imgError || !city.imgUrl ? defaultCityImg : city.imgUrl}
          alt={city.cityName}
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>

      {/* 텍스트 */}
      <div className="flex flex-col flex-1 min-w-0">
        <MarqueeText text={CITY_NAME_KO[city.cityName] ?? city.cityName} className="text-sm font-semibold text-slate-800" />
        <div className="flex items-center gap-1 min-w-0">
          {flagUrl && (
            <img src={flagUrl} alt="" className="h-3 w-auto rounded-[2px] shrink-0 object-cover" aria-hidden="true" />
          )}
          <MarqueeText text={COUNTRY_NAME_KO[city.countryName] ?? city.countryName} className="text-xs text-slate-500" />
        </div>
      </div>

      {/* 매칭 배지 */}
      {city.matchingScore !== undefined && (
        <Badge
          className={cn(
            'text-xs shrink-0 border-none',
            getMatchColor(city.matchingScore),
          )}
        >
          {city.matchingScore}%
        </Badge>
      )}
    </div>
  );
}
