import { Sparkles, Youtube, TrendingUp, Plane, MapPin, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type CityDetailTab = 'recommend' | 'youtube' | 'cost' | 'flight' | 'spots';

interface TabConfig {
  id: CityDetailTab;
  label: string;
  icon: LucideIcon;
  recommendOnly?: boolean;
}

const TABS: TabConfig[] = [
  { id: 'recommend', label: '추천 이유',    icon: Sparkles, recommendOnly: true },
  { id: 'youtube',   label: '유튜브 취향',  icon: Youtube,  recommendOnly: true },
  { id: 'cost',      label: '생활물가 비교', icon: TrendingUp },
  { id: 'flight',    label: '항공권 탐색',  icon: Plane },
  { id: 'spots',     label: '관광지',       icon: MapPin },
];

interface CityDetailTabNavProps {
  activeTab: CityDetailTab;
  onTabChange: (tab: CityDetailTab) => void;
  showRecommendTab?: boolean;
}

export function CityDetailTabNav({ activeTab, onTabChange, showRecommendTab = true }: CityDetailTabNavProps) {
  const visibleTabs = showRecommendTab ? TABS : TABS.filter((t) => !t.recommendOnly);
  return (
    <nav
      role="tablist"
      aria-label="도시 상세 탭"
      className="flex gap-2 px-5 py-3 shrink-0 overflow-x-auto"
    >
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tab-panel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
              isActive
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'text-muted-foreground border border-border hover:text-foreground hover:bg-slate-50',
            )}
          >
            <Icon className="size-3.5" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
