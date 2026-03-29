import { Sparkles, Tag, AlertTriangle, Bus, Utensils, Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BookmarkDetail } from '@/schemas/bookmark.schema';

interface RecommendReasonCardProps {
  data: BookmarkDetail;
}

const DANGER_COLOR: Record<string, string> = {
  '여행금지': 'bg-red-50 border-red-200 text-red-700',
  '출국권고': 'bg-orange-50 border-orange-200 text-orange-700',
  '여행자제': 'bg-amber-50 border-amber-200 text-amber-700',
  '여행유의': 'bg-yellow-50 border-yellow-200 text-yellow-700',
  '여행유의(일부)': 'bg-yellow-50 border-yellow-200 text-yellow-700',
};

function getDangerClass(level: string) {
  return DANGER_COLOR[level] ?? 'bg-slate-50 border-slate-200 text-slate-700';
}

export function RecommendReasonCard({ data }: RecommendReasonCardProps) {
  const displayTags = (data.tags ?? []).slice(0, 5);

  return (
    <Card className="gap-4">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-base text-slate-700">
          <Sparkles className="size-4 text-blue-500" aria-hidden="true" />
          AI 추천 이유
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* 추천 이유 */}
        {data.recommendationReason ? (
          <p className="text-sm text-slate-600 leading-relaxed italic">
            "{data.recommendationReason}"
          </p>
        ) : (
          <p className="text-sm text-slate-400">추천 이유 정보가 없습니다.</p>
        )}

        {/* 태그 */}
        {displayTags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Tag className="size-3" /> 키워드
            </p>
            <div className="flex flex-wrap gap-1.5">
              {displayTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[11px] text-blue-600 border-blue-200 bg-blue-50 rounded-full px-2.5 py-0.5"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 위험도 */}
        {data.danger && data.danger.items.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <AlertTriangle className="size-3" /> 여행 안전
            </p>
            <div className="flex flex-col gap-1">
              {data.danger.items.map((item, i) => (
                <div
                  key={i}
                  className={cn('flex items-start gap-2 rounded-lg border px-3 py-2 text-xs', getDangerClass(item.level))}
                >
                  <span className="font-bold shrink-0">[{item.level}]</span>
                  <span>{item.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 하루 예상 비용 */}
        {(data.dailyFood !== undefined || data.dailyTransport !== undefined) && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Wallet className="size-3" /> 저장 당시 하루 예상 비용
            </p>
            <div className="grid grid-cols-2 gap-2">
              {data.dailyFood !== undefined && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                  <Utensils className="size-3.5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">식비</p>
                    <p className="text-xs font-bold text-slate-800">₩{Math.round(data.dailyFood).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {data.dailyTransport !== undefined && (
                <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2">
                  <Bus className="size-3.5 text-blue-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">교통</p>
                    <p className="text-xs font-bold text-slate-800">₩{Math.round(data.dailyTransport).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
