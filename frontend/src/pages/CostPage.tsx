import { useState, type KeyboardEvent } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Search, Star, Landmark, X, ArrowDownUp, TrendingDown, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DestinationCard } from '@/components/cost/DestinationCard';
import { SmallDestinationCard } from '@/components/cost/SmallDestinationCard';
import { PromotionBanner } from '@/components/cost/PromotionBanner';
import { CostCompareSection } from '@/components/cost/CostCompareSection';
import { costApi } from '@/api/cost.api';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

// ─── 애니메이션 ───────────────────────────────────────────────────
const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── 섹션 헤더 ────────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {icon}
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
    </div>
  );
}

// ─── 카드 스켈레톤 ────────────────────────────────────────────────
function TopCardSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-5">
      {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
    </div>
  );
}

function SmallCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────
const CostPage = () => {
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchType, setSearchType] = useState<'CONTINENT' | 'COUNTRY'>('COUNTRY');
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');

  // ranking 기반 TOP 5 (한국인 인기 여행지)
  const { data: topCards, isLoading: isTopLoading } = useQuery({
    queryKey: ['cost', 'card', 'TOP'],
    queryFn: () => costApi.getCostCard(),
    staleTime: 60 * 60 * 1000,
  });

  // 저렴한 순 — type=COUNTRY + 빈 keyword → 전체 도시 ASC
  const { data: cheapCards, isLoading: isCheapLoading } = useQuery({
    queryKey: ['cost', 'search', 'COUNTRY', '', 'ASC'],
    queryFn: () => costApi.getCostSearch('COUNTRY', '', 'ASC'),
    staleTime: 60 * 60 * 1000,
  });

  // 비싼 순
  const { data: expensiveCards, isLoading: isExpensiveLoading } = useQuery({
    queryKey: ['cost', 'search', 'COUNTRY', '', 'DESC'],
    queryFn: () => costApi.getCostSearch('COUNTRY', '', 'DESC'),
    staleTime: 60 * 60 * 1000,
  });

  // 검색 결과
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ['cost', 'search', searchType, searchKeyword, sortDir],
    queryFn: () => costApi.getCostSearch(searchType, searchKeyword, sortDir),
    enabled: searchKeyword !== '',
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = () => setSearchKeyword(searchInput.trim());
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };
  const clearSearch = () => {
    setSearchInput('');
    setSearchKeyword('');
  };

  const isSearchMode = searchKeyword !== '';

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-slate-50"
    >
      {/* ── HeroSection ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-6" aria-label="물가 탐색">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            어디로 떠나볼까요?
          </motion.h1>
          <motion.p
            className="text-slate-300 text-lg mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            전 세계 물가를 비교하고 최적의 여행지를 찾아보세요
          </motion.p>

          <motion.div
            className="flex flex-col gap-3 max-w-lg mx-auto"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {/* 검색 타입 토글 */}
            <div className="flex justify-center gap-2">
              {(['COUNTRY', 'CONTINENT'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSearchType(t)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-semibold transition-colors',
                    searchType === t ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20',
                  )}
                >
                  {t === 'COUNTRY' ? '국가명으로 도시 검색' : '대륙명으로 국가 검색'}
                </button>
              ))}
            </div>

            {/* 검색 입력 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder={searchType === 'COUNTRY' ? '국가명 입력 (예: Japan, Thailand)' : '대륙명 입력 (예: Asia, Europe)'}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-12 pl-4 pr-9 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-blue-400/30 text-base"
                  aria-label="검색"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    aria-label="검색 초기화"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
              <Button
                size="lg"
                className="h-12 px-5 bg-blue-500 hover:bg-blue-400 text-white shrink-0"
                onClick={handleSearch}
              >
                <Search className="size-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 콘텐츠 ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 py-12 space-y-14">

        {/* ── 검색 결과 ──────────────────────────────────────────── */}
        {isSearchMode && (
          <section aria-label="검색 결과">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Search className="size-5 text-blue-500" />
                <h2 className="text-xl font-bold text-foreground">
                  "{searchKeyword}" 검색 결과
                </h2>
                {searchResults && (
                  <span className="text-sm text-muted-foreground">{searchResults.length}건</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'))}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
              >
                <ArrowDownUp className="size-3.5" />
                {sortDir === 'ASC' ? '저렴한 순' : '비싼 순'}
              </button>
            </div>

            {isSearchLoading ? (
              <SmallCardSkeleton count={8} />
            ) : searchResults && searchResults.length > 0 ? (
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {searchResults.map((item) => (
                  <motion.div key={item.id} variants={itemVariants}>
                    <SmallDestinationCard
                      countryId={item.id}
                      name={item.name}
                      imgUrl={item.imgUrl ?? ''}
                      avgCost={`하루 ₩${item.dailyBudget.toLocaleString()}`}
                      costColor="green"
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Landmark className="size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
              </div>
            )}
          </section>
        )}

        {/* ── 기본 섹션 ─────────────────────────────────────────── */}
        {!isSearchMode && (
          <>
            {/* TOP 5 한국인 인기 여행지 */}
            <section aria-label="한국인 인기 여행지 TOP 5">
              <SectionHeader
                icon={<Star className="size-5 text-amber-500 fill-amber-400" />}
                title="한국인이 많이 찾는 여행지 TOP 5"
              />
              {isTopLoading ? (
                <TopCardSkeleton />
              ) : (topCards ?? []).length > 0 ? (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-5 gap-5"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {(topCards ?? []).map((dest) => (
                    <motion.div key={dest.id} variants={itemVariants}>
                      <DestinationCard
                        countryId={dest.id}
                        targetType="country"
                        name={dest.name}
                        city=""
                        imgUrl={dest.imgUrl ?? ''}
                        avgCost={`하루 ₩${dest.dailyBudget.toLocaleString()}`}
                        rank={dest.rank}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-24 rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
                  데이터가 없습니다
                </div>
              )}
            </section>

            {/* 저렴한 여행지 4~8위 */}
            <section aria-label="물가가 저렴한 여행지">
              <SectionHeader
                icon={<TrendingDown className="size-5 text-emerald-500" />}
                title="물가가 저렴한 여행지"
              />
              {isCheapLoading ? (
                <SmallCardSkeleton count={4} />
              ) : (cheapCards ?? []).length > 3 ? (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {(cheapCards ?? []).slice(3, 7).map((dest) => (
                    <motion.div key={dest.id} variants={itemVariants}>
                      <SmallDestinationCard
                        countryId={dest.id}
                        name={dest.name}
                        imgUrl={dest.imgUrl ?? ''}
                        avgCost={`하루 ₩${dest.dailyBudget.toLocaleString()}`}
                        costColor="green"
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">데이터를 불러올 수 없습니다.</p>
              )}
            </section>

            {/* 비싼 여행지 */}
            <section aria-label="물가가 비싼 여행지">
              <SectionHeader
                icon={<TrendingUp className="size-5 text-red-500" />}
                title="물가가 비싼 여행지"
              />
              {isExpensiveLoading ? (
                <SmallCardSkeleton count={4} />
              ) : (expensiveCards ?? []).length > 0 ? (
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {(expensiveCards ?? []).slice(0, 4).map((dest) => (
                    <motion.div key={dest.id} variants={itemVariants}>
                      <SmallDestinationCard
                        countryId={dest.id}
                        name={dest.name}
                        imgUrl={dest.imgUrl ?? ''}
                        avgCost={`하루 ₩${dest.dailyBudget.toLocaleString()}`}
                        costColor="red"
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">데이터를 불러올 수 없습니다.</p>
              )}
            </section>

            {/* 물가 비교 (도시/국가 통합) */}
            <CostCompareSection />
          </>
        )}
      </div>

      <PromotionBanner />
    </motion.div>
  );
};

export default CostPage;
