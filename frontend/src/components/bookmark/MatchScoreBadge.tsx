interface MatchScoreBadgeProps {
  score: number;
}

function getScoreGradient(score: number): string {
  if (score >= 80) return "from-emerald-500 to-teal-400";
  if (score >= 50) return "from-blue-500 to-indigo-400";
  return "from-orange-500 to-amber-400";
}

export function MatchScoreBadge({ score }: MatchScoreBadgeProps) {
  return (
    <div
      className={`relative flex size-20 flex-col items-center justify-center rounded-full bg-gradient-to-br ${getScoreGradient(score)} shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)]`}
      role="status"
      aria-label={`매칭 점수 ${score}%`}
    >
      {/* 상단 하이라이트 */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-4 rounded-full bg-white/25 blur-sm" />
      <span className="relative text-xl font-bold text-white leading-none drop-shadow-md">
        {score}%
      </span>
    </div>
  );
}
