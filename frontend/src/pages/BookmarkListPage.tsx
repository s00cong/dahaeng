import { useState, useMemo } from "react";
import { useSearch, Link } from "@tanstack/react-router";
import { motion, type Variants } from "framer-motion";
import { ChevronRight, BookmarkX } from "lucide-react";
import { useBookmarkList } from "@/hooks/bookmark/useBookmarkList";
import { useDeleteBookmark } from "@/hooks/bookmark/useDeleteBookmark";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import QueryErrorFallback from "@/components/common/QueryErrorFallback";
import { BookmarkCard } from "@/components/bookmark/BookmarkCard";
import { AddCityCard } from "@/components/bookmark/AddCityCard";
import { Pagination } from "@/components/common/Pagination";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { BookmarkListItem } from "@/schemas/bookmark.schema";

// ─── Constants ───────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 8;

type ContinentFilter =
  | "all"
  | "asia"
  | "europe"
  | "americas"
  | "oceania"
  | "middleeast_africa";

const FILTER_OPTIONS: { value: ContinentFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "asia", label: "아시아" },
  { value: "europe", label: "유럽" },
  { value: "americas", label: "아메리카" },
  { value: "oceania", label: "오세아니아" },
  { value: "middleeast_africa", label: "중동·아프리카" },
];

// Rough continent → filter mapping (client-side heuristic by countryName)
const CONTINENT_KEYWORDS: Record<ContinentFilter, string[]> = {
  all: [],
  asia: [
    "japan",
    "china",
    "korea",
    "thailand",
    "vietnam",
    "indonesia",
    "malaysia",
    "singapore",
    "philippines",
    "india",
    "taiwan",
    "hong kong",
    "cambodia",
    "myanmar",
    "laos",
    "bangladesh",
    "nepal",
    "sri lanka",
    "maldives",
    "일본",
    "중국",
    "한국",
    "태국",
    "베트남",
    "인도네시아",
    "말레이시아",
    "싱가포르",
    "필리핀",
    "인도",
    "대만",
    "홍콩",
  ],
  europe: [
    "france",
    "germany",
    "italy",
    "spain",
    "uk",
    "united kingdom",
    "netherlands",
    "switzerland",
    "austria",
    "portugal",
    "greece",
    "czech",
    "poland",
    "hungary",
    "belgium",
    "sweden",
    "norway",
    "denmark",
    "finland",
    "croatia",
    "romania",
    "프랑스",
    "독일",
    "이탈리아",
    "스페인",
    "영국",
    "네덜란드",
    "스위스",
  ],
  americas: [
    "usa",
    "united states",
    "canada",
    "mexico",
    "brazil",
    "argentina",
    "peru",
    "colombia",
    "chile",
    "cuba",
    "costa rica",
    "미국",
    "캐나다",
    "멕시코",
    "브라질",
    "아르헨티나",
  ],
  oceania: [
    "australia",
    "new zealand",
    "fiji",
    "papua",
    "samoa",
    "호주",
    "뉴질랜드",
    "피지",
  ],
  middleeast_africa: [
    "uae",
    "dubai",
    "saudi",
    "qatar",
    "jordan",
    "israel",
    "turkey",
    "egypt",
    "morocco",
    "kenya",
    "south africa",
    "nigeria",
    "ethiopia",
    "tanzania",
    "터키",
    "이집트",
    "이스라엘",
    "두바이",
    "사우디",
  ],
};

function matchesContinent(
  item: BookmarkListItem,
  filter: ContinentFilter,
): boolean {
  if (filter === "all") return true;
  const haystack = `${item.cityName} ${item.countryName}`.toLowerCase();
  return CONTINENT_KEYWORDS[filter].some((kw) => haystack.includes(kw));
}

// ─── Animation variants ───────────────────────────────────────────────────────
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

// ─── BookmarkListPage ─────────────────────────────────────────────────────────
const BookmarkListPage = () => {
  const { keyword } = useSearch({ from: "/_authenticated/bookmarks/" });
  const [continentFilter, setContinentFilter] =
    useState<ContinentFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useBookmarkList({
    keyword,
    page: currentPage - 1,
    size: ITEMS_PER_PAGE,
  });
  const { mutate: deleteBookmark } = useDeleteBookmark();

  // Client-side continent filtering (현재 페이지 내에서만)
  const pagedData = useMemo(() => {
    if (!data) return [];
    return data.content.filter((item) => matchesContinent(item, continentFilter));
  }, [data, continentFilter]);

  const totalPages = data?.totalPages ?? 1;

  const handleFilterChange = (value: string) => {
    setContinentFilter(value as ContinentFilter);
    setCurrentPage(1);
  };

  const handleDelete = (bookmarkId: number) => {
    deleteBookmark(bookmarkId);
  };

  return (
    <motion.div
      className="min-h-screen bg-slate-50"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(135deg, #93C5FD 0%, #93C5FD 100%)",
      }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="mx-auto max-w-7xl px-3 pt-24 pb-6">
        {/* 브레드크럼 */}
        <nav
          className="mb-6 flex items-center gap-1.5 text-sm text-slate-400"
          aria-label="브레드크럼"
        >
          <Link
            to="/main"
            className="hover:text-slate-700 transition-colors no-underline"
            aria-label="홈으로 이동"
          >
            홈
          </Link>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="text-slate-600 font-medium">저장된 도시</span>
        </nav>

        {/* 헤더 행 */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">
            총 저장한 도시 :{" "}
            <span className="text-blue-600">
              {data ? data.totalElements : 0}개
            </span>
          </h1>

          {/* 필터 드롭다운 */}
          <div className="flex items-center gap-2">
            <Select value={continentFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-40" aria-label="대륙별 필터">
                <SelectValue placeholder="필터" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="flex min-h-64 items-center justify-center">
            <LoadingSpinner size="lg" message="북마크 불러오는 중..." />
          </div>
        )}

        {/* 에러 상태 */}
        {isError && (
          <div className="mx-auto max-w-md">
            <QueryErrorFallback
              error={error as Error}
              onRetry={() => refetch()}
            />
          </div>
        )}

        {/* 데이터 영역 */}
        {data && (
          <>
            {/* 빈 상태 */}
            {pagedData.length === 0 ? (
              <motion.div
                className="flex min-h-64 flex-col items-center justify-center gap-4 text-slate-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <BookmarkX className="size-16 stroke-1" aria-hidden="true" />
                <p className="text-base font-medium">저장된 도시가 없습니다.</p>
                <AddCityCard />
              </motion.div>
            ) : (
              <>
                {/* 카드 그리드 */}
                <motion.div
                  key={`${continentFilter}-${currentPage}`}
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {pagedData.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.05 }}
                    >
                      <BookmarkCard item={item} onDelete={handleDelete} />
                    </motion.div>
                  ))}

                  {/* AddCityCard는 마지막에 */}
                  {currentPage === totalPages && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut", delay: pagedData.length * 0.05 }}
                    >
                      <AddCityCard />
                    </motion.div>
                  )}
                </motion.div>

                {/* 페이지네이션 */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  className="mt-10"
                />
              </>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default BookmarkListPage;
