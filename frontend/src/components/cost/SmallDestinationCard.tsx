import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Landmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CITY_NAME_KO } from '@/data/cityNameKo';
import { COUNTRY_NAME_KO } from '@/data/countryNameKo';
import { useCountryFlagMap } from '@/hooks/country/useCountryFlagMap';

interface SmallDestinationCardProps {
  countryId: number;
  targetType?: 'city' | 'country';
  name: string;
  countryName?: string;
  imgUrl: string;
  avgCost: string;
  costColor?: 'green' | 'red';
}

export function SmallDestinationCard({
  countryId,
  targetType = 'city',
  name,
  countryName,
  imgUrl,
  avgCost,
  costColor = 'green',
}: SmallDestinationCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const nameKo = CITY_NAME_KO[name] ?? COUNTRY_NAME_KO[name];
  const { data: flagMap } = useCountryFlagMap();
  const flagUrl = countryName ? flagMap?.get(countryName) : undefined;
  const countryNameKo = countryName ? (COUNTRY_NAME_KO[countryName] ?? countryName) : undefined;

  const handleClick = () => {
    void navigate({ to: '/cost/$countryId', params: { countryId }, search: { targetType } });
  };

  return (
    <motion.article
      whileHover={{ y: -3, boxShadow: '0 12px 24px rgba(0,0,0,0.10)' }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-card rounded-xl overflow-hidden cursor-pointer border border-border/60 shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      role="button"
      aria-label={`${name} 물가 상세 보기`}
    >
      {/* 썸네일 */}
      <div className="relative h-40 bg-slate-200">
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <Landmark className="size-10 text-slate-400" aria-hidden="true" />
          </div>
        ) : (
          <img
            src={imgUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        {(flagUrl || countryNameKo) && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/15 backdrop-blur-md rounded-md px-1.5 py-0.5 border border-white/25 shadow-sm">
            {flagUrl && <img src={flagUrl} alt="" className="h-3 w-auto rounded-[2px] shrink-0" aria-hidden="true" />}
            {countryNameKo && <span className="text-[10px] text-white font-medium leading-none drop-shadow-sm">{countryNameKo}</span>}
          </div>
        )}
      </div>

      {/* 카드 하단 */}
      <div className="p-3">
        <h3 className="font-semibold text-foreground text-sm truncate">{nameKo ?? name}</h3>
        {nameKo && <p className="text-[10px] text-muted-foreground truncate">{name}</p>}
        <p
          className={cn(
            'text-xs mt-0.5 font-medium',
            costColor === 'green' ? 'text-emerald-600' : 'text-red-500',
          )}
        >
          {avgCost}
        </p>
      </div>
    </motion.article>
  );
}
