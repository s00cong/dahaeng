import { ExternalLink, Newspaper } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNews } from '@/hooks/news/useNews';
import dayjs from '@/utils/dayjs';
import { cn } from '@/lib/utils';
import type { CityDetail } from '@/schemas/city.schema';
import { CITY_NAME_KO } from '@/data/cityNameKo';
import type { NewsItem } from '@/schemas/news.schema';

interface NewsTabProps {
  city: CityDetail;
}

const DUMMY_NEWS_ITEMS: NewsItem[] = [
  {
    id: 1,
    title: '시드니 인기 레스티랑의 메뉴 가격이 상승하고 있습니다. 여행 전 예산에 참고하세요.',
    source: 'The Sydney Morning Herald',
    url: '#',
    publishedAt: '2024-06-12',
    summary: '현지 물가 상황이 안정적이며 관광객들을 위한 서비스 환경이 개선되고 있습니다.',
    sentiment: 'positive',
  },
  {
    id: 2,
    title: '좋은 날씨의 봄철을 맞이하여, 야외활동 하기 좋은 날씨가 계속됩니다.',
    source: 'Travel Weekly',
    url: '#',
    publishedAt: '2024-06-11',
    summary: '맑고 화창한 날씨가 이어지며 야외 활동에 최적의 조건입니다.',
    sentiment: 'positive',
  },
  {
    id: 3,
    title: '한국인 여행객을 위한 새로운 대중교통 노선이 개편되었습니다.',
    source: 'Local Travel News',
    url: '#',
    publishedAt: '2024-06-10',
    summary: '대중교통 시스템이 정상적으로 운행 중이며 노선 개편으로 이동이 더 편리해졌습니다.',
    sentiment: 'neutral',
  },
];

const DUMMY_SUMMARIES = [
  { category: '안전', text: '현지 상황은 안정적입니다.' },
  { category: '날씨', text: '맑은 날씨가 이어지고 있습니다.' },
  { category: '교통', text: '대중교통 정상 운행 중입니다.' },
];

function NewsBadge({ sentiment }: { sentiment?: string }) {
  if (sentiment === 'positive') {
    return (
      <Badge className="bg-green-500 text-white border-transparent text-[10px] font-bold tracking-wider rounded-full px-2.5">
        GOOD NEWS
      </Badge>
    );
  }
  if (sentiment === 'negative') {
    return (
      <Badge className="bg-red-500 text-white border-transparent text-[10px] font-bold tracking-wider rounded-full px-2.5">
        BREAKING
      </Badge>
    );
  }
  return (
    <Badge className="bg-blue-500 text-white border-transparent text-[10px] font-bold tracking-wider rounded-full px-2.5">
      LATEST
    </Badge>
  );
}

interface ArticleCardProps {
  item: NewsItem;
}

function ArticleCard({ item }: ArticleCardProps) {
  const handleClick = () => {
    if (item.url && item.url !== '#') {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article className="flex flex-col gap-2 p-3 rounded-xl border border-border hover:border-blue-200 dark:hover:border-blue-800 hover:bg-accent/30 transition-colors">
      <h4 className="text-xs font-medium text-foreground line-clamp-2 leading-relaxed">
        {item.title}
      </h4>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="text-[10px]">{item.source}</span>
          {item.publishedAt && (
            <>
              <span className="text-[10px]">·</span>
              <span className="text-[10px]">
                {dayjs(item.publishedAt).format('YYYY.MM.DD')}
              </span>
            </>
          )}
        </div>
        <button
          onClick={handleClick}
          aria-label={`${item.title} 기사 보기`}
          className={cn(
            'flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 font-medium',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded',
          )}
        >
          기사 보기
          <ExternalLink className="size-2.5" />
        </button>
      </div>
    </article>
  );
}

export function NewsTab({ city }: NewsTabProps) {
  const { data: newsItems, isLoading } = useNews(city.countryId);

  const displayItems = newsItems && newsItems.length > 0 ? newsItems : DUMMY_NEWS_ITEMS;

  // Determine overall sentiment from first item
  const overallSentiment = displayItems[0]?.sentiment;

  // Summary categories
  const summaryItems = DUMMY_SUMMARIES.map((dummy, idx) => ({
    category: dummy.category,
    text: displayItems[idx]?.summary
      ? displayItems[idx].summary!.slice(0, 50)
      : dummy.text,
  }));

  return (
    <div className="flex gap-4 p-5 h-full">
      {/* Left: News Summary Section (55%) */}
      <section
        aria-label="최신 뉴스 요약"
        className="flex flex-col gap-3 flex-[55]"
      >
        <div className="flex items-center gap-2">
          <Newspaper className="size-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-foreground">
            {CITY_NAME_KO[city.cityName] ?? city.cityName} 뉴스 요약
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            최근 뉴스 기사들의 주요 요점 분석
          </span>
          <NewsBadge sentiment={overallSentiment} />
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {summaryItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 p-3 rounded-xl bg-card border border-border">
                <div className="shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-500" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">{item.category}: </span>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vertical divider */}
      <div className="w-px bg-border shrink-0" />

      {/* Right: Article Scroll Section (45%) */}
      <section
        aria-label="주요 기사"
        className="flex flex-col gap-3 flex-[45] min-w-0"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">주요 기사</h3>
          <button
            aria-label="더 많은 기사 보기"
            className="text-xs text-blue-500 hover:text-blue-600 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded"
          >
            더보기 →
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2 overflow-y-auto">
            {displayItems.slice(0, 3).map((item: NewsItem, idx: number) => (
              <ArticleCard key={item.id ?? idx} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
