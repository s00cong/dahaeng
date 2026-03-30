import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { MapPin, Landmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CITY_NAME_KO } from '@/data/cityNameKo';
import { COUNTRY_NAME_KO } from '@/data/countryNameKo';

interface DestinationCardProps {
  countryId: number;
  targetType?: 'city' | 'country';
  name: string;
  city: string;
  imgUrl: string;
  avgCost: string;
  rank?: number;
}

export function DestinationCard({
  countryId,
  targetType = 'city',
  name,
  city,
  imgUrl,
  avgCost,
  rank,
}: DestinationCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const nameKo = CITY_NAME_KO[name] ?? COUNTRY_NAME_KO[name];
  const handleClick = () => {
    void navigate({ to: '/cost/$countryId', params: { countryId }, search: { targetType } });
  };

  return (
    <motion.article
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative overflow-hidden rounded-2xl cursor-pointer h-44',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      role="button"
      aria-label={`${name} ${city} 물가 상세 보기`}
    >
      {/* 배경 이미지 */}
      {imgError ? (
        <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
          <Landmark className="size-12 text-slate-400" aria-hidden="true" />
        </div>
      ) : (
        <img
          src={imgUrl}
          alt={`${name} ${city}`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
      )}

      {/* 하단 그라디언트 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      {/* BEST 배지 */}
      {rank !== undefined && (
        <div className="absolute top-3 left-3">
          <Badge className="bg-amber-400 text-amber-900 border-transparent font-bold text-xs px-2.5">
            BEST {rank}
          </Badge>
        </div>
      )}

      {/* 하단 텍스트 */}
      <div className="absolute bottom-0 left-0 right-0 p-3.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <MapPin className="size-3 text-white/80" aria-hidden="true" />
          <span className="text-white/80 text-xs">{city}</span>
        </div>
        <h3 className="text-white text-lg font-bold leading-tight">{nameKo ?? name}</h3>
        {nameKo && <p className="text-white/60 text-[11px]">{name}</p>}
        <p className="text-white/70 text-xs mt-0.5">{avgCost}</p>
      </div>
    </motion.article>
  );
}
