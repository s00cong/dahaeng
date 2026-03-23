import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import type { BookmarkDetail } from "@/schemas/bookmark.schema";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { CITY_NAME_KO } from "@/data/cityNameKo";
import { COUNTRY_NAME_KO } from "@/data/countryNameKo";
import { useUpdateBookmarkTitle } from "@/hooks/bookmark/useUpdateBookmarkTitle";

interface BookmarkHeroSectionProps {
  data: BookmarkDetail;
  bookmarkId: number;
}

export function BookmarkHeroSection({
  data,
  bookmarkId,
}: BookmarkHeroSectionProps) {
  const { mutate: updateTitle } = useUpdateBookmarkTitle(bookmarkId);
  const [isEditing, setIsEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(data.title ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleValue(data.title ?? "");
  }, [data.title]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = titleValue.trim();
    if (trimmed.length < 1) {
      setTitleValue(data.title ?? "");
      setIsEditing(false);
      return;
    }
    updateTitle(trimmed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitleValue(data.title ?? "");
    setIsEditing(false);
  };

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
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />

      {/* 어두운 그라디언트 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* 좌하단 도시명 + 제목 */}
      <div className="absolute bottom-8 left-8 flex flex-col">
        <p className="text-sm font-medium text-white/75 uppercase tracking-widest">
          저장된 도시
        </p>

        <h2 className="mt-1 text-lg font-bold text-white drop-shadow-md">
          {CITY_NAME_KO[data.cityName] ?? data.cityName},{" "}
          {COUNTRY_NAME_KO[data.countryName] ?? data.countryName}
        </h2>

        {/* 제목 편집 영역 */}
        {isEditing ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && titleValue.trim().length >= 1)
                  handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              className="bg-white/20 backdrop-blur-md border border-white/40 rounded-lg px-3 py-1 text-white text-base placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/60 w-56"
              placeholder="제목을 입력해주세요"
            />
            <button
              onClick={handleSave}
              disabled={titleValue.trim().length < 1}
              aria-label="제목 저장"
              className="flex items-center justify-center size-7 rounded-full bg-white/20 hover:bg-white/40 text-white disabled:opacity-40 transition-colors"
            >
              <Check className="size-4" />
            </button>
            <button
              onClick={handleCancel}
              aria-label="제목 수정 취소"
              className="flex items-center justify-center size-7 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-4xl font-semibold text-white drop-shadow">
              {titleValue || (
                <span className="text-white/50 font-normal text-base">
                  제목 없음
                </span>
              )}
            </span>
            <button
              onClick={() => setIsEditing(true)}
              aria-label="제목 수정"
              className="flex items-center justify-center size-6 rounded-full bg-white/20 hover:bg-white/40 text-white/80 hover:text-white transition-colors"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 우하단 매칭 점수 배지 */}
      {data.matchingScore !== undefined && (
        <div className="absolute right-8 bottom-8">
          <MatchScoreBadge score={data.matchingScore} />
        </div>
      )}
    </section>
  );
}
