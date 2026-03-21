import { Newspaper, ExternalLink, ImageOff } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import dayjs from '@/utils/dayjs';
import type { BookmarkDetail } from '@/schemas/bookmark.schema';

type NewsAtSavedItem = NonNullable<BookmarkDetail['newsAtSaved']>[number];

const MAX_NEWS_ITEMS = 3;

interface SavedNewsCardProps {
  news?: NewsAtSavedItem[];
  summation?: string;
}

function NewsItemCard({ item }: { item: NewsAtSavedItem }) {
  const domain = item.url ? (() => { try { return new URL(item.url).hostname; } catch { return null; } })() : null;
  const faviconSrc = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded-xl border border-slate-100 bg-white p-3 hover:border-blue-200 hover:shadow-sm transition-all"
      aria-label={`${item.title} (새 탭에서 열기)`}
    >
      {/* 썸네일 */}
      <div className="w-20 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
        {item.urlToImage ? (
          <img
            src={item.urlToImage}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (faviconSrc) {
                img.src = faviconSrc;
                img.className = 'w-8 h-8 object-contain';
              } else {
                img.style.display = 'none';
              }
            }}
          />
        ) : faviconSrc ? (
          <img src={faviconSrc} alt={domain ?? ''} className="w-8 h-8 object-contain" />
        ) : (
          <ImageOff className="size-5 text-slate-300" />
        )}
      </div>

      {/* 텍스트 */}
      <div className="min-w-0 flex-1 flex flex-col justify-between">
        <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
          {item.title}
        </p>
        {item.description && (
          <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 mt-1">
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-1.5">
          {item.publishedAt && (
            <span className="text-[10px] text-slate-400">
              {dayjs(item.publishedAt).format('YYYY.MM.DD')}
            </span>
          )}
          <ExternalLink className="size-3 text-slate-300 group-hover:text-blue-400 transition-colors ml-auto" />
        </div>
      </div>
    </a>
  );
}

export function SavedNewsCard({ news, summation }: SavedNewsCardProps) {
  const displayedNews = news && news.length > 0 ? news.slice(0, MAX_NEWS_ITEMS) : null;

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
          <div className="flex flex-col gap-2">
            {displayedNews.map((item, idx) => (
              <NewsItemCard key={idx} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">저장된 뉴스 데이터가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}
