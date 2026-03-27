import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface LiquidGlassCardProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
}

export function LiquidGlassCard({ children, className, containerClassName }: LiquidGlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-px overflow-hidden shadow-2xl",
        containerClassName
      )}
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)`,
      }}
    >
      {/* 테두리 은은한 글로우 */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at 0% 0%, rgba(59,130,246,0.3) 0%, transparent 50%)`,
        }}
      />

      {/* 카드 본체 */}
      <div
        className={cn(
          "relative h-full rounded-2xl p-4 flex flex-col backdrop-blur-xl saturate-[180%] brightness-110",
          "bg-slate-900/70 border border-white/10",
          className
        )}
        style={{
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
