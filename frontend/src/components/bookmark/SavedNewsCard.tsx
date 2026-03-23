import { useState } from 'react';
import { Newspaper, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import dayjs from '@/utils/dayjs';
import type { BookmarkDetail } from '@/schemas/bookmark.schema';

type NewsAtSavedItem = NonNullable<BookmarkDetail['newsAtSaved']>[number];

interface SavedNewsCardProps {
  news?: NewsAtSavedItem[];
  summation?: string;
}

function NewsCarousel({ news }: { news: NewsAtSavedItem[] }) {
  const [idx, setIdx] = useState(0);

  const current = news[idx];
  const total = news.length;
  const domain = current.url ? (() => { try { return new URL(current.url).hostname; } catch { return null; } })() : null;
  const faviconSrc = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

  return (
    <div className="flex flex-col rounded-xl border border-slate-100 overflow-hidden bg-white">
      {/* 이미지 영역 */}
      <div className="relative h-36 bg-slate-100 shrink-0">
        {current.urlToImage ? (
          <img
            key={current.urlToImage}
            src={current.urlToImage}
            alt={current.title ?? ''}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = 'none';
              const fallback = img.parentElement?.querySelector('.favicon-fallback') as HTMLElement | null;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : null}
        {/* favicon 폴백 */}
        <div
          className="favicon-fallback absolute inset-0 flex items-center justify-center bg-slate-100"
          style={{ display: current.urlToImage ? 'none' : 'flex' }}
        >
          {faviconSrc
            ? <img src={faviconSrc} alt={domain ?? ''} className="w-12 h-12 object-contain opacity-50" />
            : <Newspaper className="size-10 text-slate-300" />
          }
        </div>
        {/* 그라디언트 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {/* 인덱스 표시 */}
        <div className="absolute top-2 right-2 bg-black/40 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
          {idx + 1} / {total}
        </div>
        {/* 좌우 화살표 */}
        {total > 1 && (
          <>
            <button
              onClick={() => setIdx((prev) => (prev - 1 + total) % total)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-colors"
              aria-label="이전 뉴스"
            >
              <ChevronLeft className="size-4 text-slate-700" />
            </button>
            <button
              onClick={() => setIdx((prev) => (prev + 1) % total)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-colors"
              aria-label="다음 뉴스"
            >
              <ChevronRight className="size-4 text-slate-700" />
            </button>
          </>
        )}
      </div>

      {/* 텍스트 영역 */}
      <a
        href={current.url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col gap-1.5 p-3 hover:bg-slate-50 transition-colors"
      >
        <p className="text-[12px] font-bold text-slate-800 line-clamp-3 group-hover:text-blue-600 transition-colors leading-snug">
          {current.title}
        </p>
        {current.description && (
          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{current.description}</p>
        )}
        <div className="flex items-center justify-between mt-1">
          {current.publishedAt && (
            <p className="text-[10px] text-slate-400">{dayjs(current.publishedAt).format('YYYY.MM.DD')}</p>
          )}
          <ExternalLink className="size-3 text-slate-300 group-hover:text-blue-400 transition-colors ml-auto" />
        </div>
      </a>

      {/* 하단 dot 인디케이터 */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full transition-all ${i === idx ? 'w-4 h-1.5 bg-blue-500' : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'}`}
              aria-label={`${i + 1}번 뉴스로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SavedNewsCard({ news, summation }: SavedNewsCardProps) {
  const displayedNews = news && news.length > 0 ? news : null;

  return (
    <Card className="gap-4">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-base text-slate-700">
          <Newspaper className="size-4 text-purple-500" aria-hidden="true" />
          주요 이슈
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* AI 뉴스 요약 */}
        {summation && (
          <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-lg px-3 py-2 italic">
            "{summation}"
          </p>
        )}
        {displayedNews ? (
          <NewsCarousel news={displayedNews} />
        ) : (
          <p className="text-sm text-slate-400">저장된 뉴스 데이터가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}
