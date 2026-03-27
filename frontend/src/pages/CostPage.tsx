import { useState, type KeyboardEvent } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Search,
  Star,
  Landmark,
  X,
  ArrowDownUp,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DestinationCard } from "@/components/cost/DestinationCard";
import { SmallDestinationCard } from "@/components/cost/SmallDestinationCard";
import { PromotionBanner } from "@/components/cost/PromotionBanner";
import { CostCompareSection } from "@/components/cost/CostCompareSection";
import { costApi } from "@/api/cost.api";
import { useQuery } from "@tanstack/react-query";
import { useCityList } from "@/hooks/city/useCityList";
import { cn } from "@/lib/utils";
import { CITY_NAME_KO_REVERSE } from "@/data/cityNameKo";

const COUNTRY_NAME_KO: Record<string, string> = {
  일본: "Japan",
  한국: "Korea",
  미국: "United States",
  베트남: "Vietnam",
  중국: "China",
  태국: "Thailand",
  필리핀: "Philippines",
  프랑스: "France",
  러시아: "Russia",
  호주: "Australia",
  대만: "Taiwan",
  영국: "United Kingdom",
  독일: "Germany",
  싱가포르: "Singapore",
  이탈리아: "Italy",
  네덜란드: "Netherlands",
  스위스: "Switzerland",
  말레이시아: "Malaysia",
  캐나다: "Canada",
  캄보디아: "Cambodia",
  몽골: "Mongolia",
  뉴질랜드: "New Zealand",
  인도: "India",
  스페인: "Spain",
  브라질: "Brazil",
  멕시코: "Mexico",
  헝가리: "Hungary",
  핀란드: "Finland",
  터키: "Turkey",
  남아프리카: "South Africa",
  인도네시아: "Indonesia",
  라오스: "Laos",
  체코: "Czech Republic",
  오스트리아: "Austria",
  크로아티아: "Croatia",
  몰디브: "Maldives",
  포르투갈: "Portugal",
  카타르: "Qatar",
  그리스: "Greece",
  폴란드: "Poland",
  스웨덴: "Sweden",
  노르웨이: "Norway",
  페루: "Peru",
  이집트: "Egypt",
  아이슬란드: "Iceland",
  덴마크: "Denmark",
  벨기에: "Belgium",
  볼리비아: "Bolivia",
  아르헨티나: "Argentina",
  칠레: "Chile",
  네팔: "Nepal",
  팔라우: "Palau",
  카자흐스탄: "Kazakhstan",
  모로코: "Morocco",
  쿠바: "Cuba",
  케냐: "Kenya",
  UAE: "UAE",
  모리셔스: "Mauritius",
};

const CONTINENT_NAME_KO: Record<string, string> = {
  아시아: "Asia",
  유럽: "Europe",
  북미: "North America",
  북아메리카: "North America",
  남미: "South America",
  남아메리카: "South America",
  아프리카: "Africa",
  오세아니아: "Oceania",
};

function toEnglishKeyword(
  input: string,
  type: "CONTINENT" | "COUNTRY",
): string {
  const trimmed = input.trim();
  if (type === "CONTINENT") return CONTINENT_NAME_KO[trimmed] ?? trimmed;
  return COUNTRY_NAME_KO[trimmed] ?? CITY_NAME_KO_REVERSE[trimmed] ?? trimmed;
}

// ─── 애니메이션 ───────────────────────────────────────────────────
const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
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
function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
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
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-44 rounded-2xl" />
      ))}
    </div>
  );
}

function SmallCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-xl" />
      ))}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────
const CostPage = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchType, setSearchType] = useState<"CONTINENT" | "COUNTRY">(
    "COUNTRY",
  );
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");

  const { data: cityList } = useCityList();
  const cityCountryMap = new Map(
    (cityList ?? []).map((c) => [c.cityId, c.countryName]),
  );

  // ranking 기반 TOP 5 (한국인 인기 여행지)
  const { data: topCards, isLoading: isTopLoading } = useQuery({
    queryKey: ["cost", "card", "TOP"],
    queryFn: () => costApi.getCostCard(),
    staleTime: 60 * 60 * 1000,
  });

  // 저렴한 순 — type=COUNTRY + 빈 keyword → 전체 도시 ASC
  const { data: cheapCards, isLoading: isCheapLoading } = useQuery({
    queryKey: ["cost", "search", "COUNTRY", "", "ASC"],
    queryFn: () => costApi.getCostSearch("COUNTRY", "", "ASC"),
    staleTime: 60 * 60 * 1000,
  });

  // 비싼 순
  const { data: expensiveCards, isLoading: isExpensiveLoading } = useQuery({
    queryKey: ["cost", "search", "COUNTRY", "", "DESC"],
    queryFn: () => costApi.getCostSearch("COUNTRY", "", "DESC"),
    staleTime: 60 * 60 * 1000,
  });

  // 검색 결과
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: ["cost", "search", searchType, searchKeyword, sortDir],
    queryFn: () => costApi.getCostSearch(searchType, searchKeyword, sortDir),
    enabled: searchKeyword !== "",
    staleTime: 0,
  });

  const handleSearch = () =>
    setSearchKeyword(toEnglishKeyword(searchInput, searchType));
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };
  const clearSearch = () => {
    setSearchInput("");
    setSearchKeyword("");
  };

  const isSearchMode = searchKeyword !== "";

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-slate-50"
    >
      {/* ── HeroSection ─────────────────────────────────────────── */}
      <section
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-6"
        aria-label="물가 탐색"
      >
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
              {(["COUNTRY", "CONTINENT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setSearchType(t);
                    setSearchInput("");
                    setSearchKeyword("");
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors",
                    searchType === t
                      ? "bg-blue-500 text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20",
                  )}
                >
                  {t === "COUNTRY"
                    ? "국가명으로 도시 검색"
                    : "대륙명으로 국가 검색"}
                </button>
              ))}
            </div>

            {/* 검색 입력 */}
            <div className="flex gap-2">
              {searchType === "CONTINENT" ? (
                <select
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setSearchKeyword(e.target.value);
                  }}
                  className="flex-1 h-12 px-4 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 text-base cursor-pointer"
                  aria-label="대륙 선택"
                >
                  <option value="" disabled className="text-slate-800">
                    대륙 선택
                  </option>
                  {[
                    { label: "아시아", value: "Asia" },
                    { label: "유럽", value: "Europe" },
                    { label: "북아메리카", value: "North America" },
                    { label: "남아메리카", value: "South America" },
                    { label: "아프리카", value: "Africa" },
                    { label: "오세아니아", value: "Oceania" },
                  ].map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      className="text-slate-800"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="국가명 입력 (예: Japan, 일본, 태국)"
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
              )}
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
                  <span className="text-sm text-muted-foreground">
                    {searchResults.length}건
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setSortDir((d) => (d === "ASC" ? "DESC" : "ASC"))
                }
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 transition-colors"
              >
                <ArrowDownUp className="size-3.5" />
                {sortDir === "ASC" ? "저렴한 순" : "비싼 순"}
              </button>
            </div>

            {isSearchLoading ? (
              <SmallCardSkeleton count={8} />
            ) : searchResults && searchResults.length > 0 ? (
              <motion.div
                key={`${searchKeyword}-${sortDir}`}
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
                      imgUrl={item.imgUrl ?? ""}
                      avgCost={`하루 ₩${item.dailyBudget.toLocaleString()}`}
                      costColor="green"
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Landmark className="size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </p>
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
                        imgUrl={dest.imgUrl ?? ""}
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
                        countryName={cityCountryMap.get(dest.id)}
                        imgUrl={dest.imgUrl ?? ""}
                        avgCost={`하루 ₩${dest.dailyBudget.toLocaleString()}`}
                        costColor="green"
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  데이터를 불러올 수 없습니다.
                </p>
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
                        countryName={cityCountryMap.get(dest.id)}
                        imgUrl={dest.imgUrl ?? ""}
                        avgCost={`하루 ₩${dest.dailyBudget.toLocaleString()}`}
                        costColor="red"
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  데이터를 불러올 수 없습니다.
                </p>
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
