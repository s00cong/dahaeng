interface MatchScoreBadgeProps {
  score: number;
}

export function MatchScoreBadge({ score }: MatchScoreBadgeProps) {
  return (
    <div
      className="flex size-20 flex-col items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-yellow-300 shadow-lg"
      role="status"
      aria-label={`매칭 점수 ${score}점`}
    >
      <span className="text-xl font-bold text-white leading-none">{score}점</span>
    </div>
  );
}
