import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Landmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SmallDestinationCardProps {
  countryId: number;
  targetType?: 'city' | 'country';
  name: string;
  imgUrl: string;
  avgCost: string;
  costColor?: 'green' | 'red';
}

export function SmallDestinationCard({
  countryId,
  targetType = 'city',
  name,
  imgUrl,
  avgCost,
  costColor = 'green',
}: SmallDestinationCardProps) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

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
      </div>

      {/* 카드 하단 */}
      <div className="p-3">
        <h3 className="font-semibold text-foreground text-sm truncate">{name}</h3>
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
