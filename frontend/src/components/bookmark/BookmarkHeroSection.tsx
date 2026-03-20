import type { BookmarkDetail } from "@/schemas/bookmark.schema";
import { MatchScoreBadge } from "./MatchScoreBadge";

interface BookmarkHeroSectionProps {
  data: BookmarkDetail;
}

export function BookmarkHeroSection({ data }: BookmarkHeroSectionProps) {
  return (
    <section
      className="relative h-[300px] w-full overflow-hidden"
      aria-label="도시 히어로 섹션"
    >
      {/* 배경 이미지 */}
      <img
        src={data.imgUrl ?? undefined}
        alt={`${data.cityName} 도시 전경`}
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />

      {/* 어두운 그라디언트 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* 좌하단 도시명 */}
      <div className="absolute bottom-8 left-8">
        <p className="mb-1 text-sm font-medium text-white/75 uppercase tracking-widest">
          저장된 도시
        </p>
        <h1 className="text-4xl font-bold text-white drop-shadow-md">
          {data.cityName}, {data.countryName}
        </h1>
      </div>

      {/* 우상단 매칭 점수 배지 */}
      {data.matchingScore !== undefined && (
        <div className="absolute right-8 bottom-8">
          <MatchScoreBadge score={data.matchingScore} />
        </div>
      )}
    </section>
  );
}
