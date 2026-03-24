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

// countryNameKo.ts 기준 162개 나라 대륙별 매핑
const CONTINENT_KEYWORDS: Record<ContinentFilter, string[]> = {
  all: [],
  asia: [
    // 동아시아
    "japan",
    "china",
    "south korea",
    "north korea",
    "taiwan",
    "mongolia",
    "hong kong",
    // 동남아시아
    "vietnam",
    "thailand",
    "indonesia",
    "malaysia",
    "singapore",
    "philippines",
    "cambodia",
    "myanmar",
    "laos",
    "timor-leste",
    // 남아시아
    "india",
    "pakistan",
    "bangladesh",
    "sri lanka",
    "nepal",
    "bhutan",
    // 중앙아시아
    "kazakhstan",
    "uzbekistan",
    "kyrgyzstan",
    "tajikistan",
    "turkmenistan",
    // 러시아 (아시아/유럽 모두 포함)
    "russia",
    // 한국어
    "일본",
    "중국",
    "대한민국",
    "북한",
    "대만",
    "몽골",
    "홍콩",
    "베트남",
    "태국",
    "인도네시아",
    "말레이시아",
    "싱가포르",
    "필리핀",
    "캄보디아",
    "미얀마",
    "라오스",
    "동티모르",
    "인도",
    "파키스탄",
    "방글라데시",
    "스리랑카",
    "네팔",
    "부탄",
    "카자흐스탄",
    "우즈베키스탄",
    "키르기스스탄",
    "타지키스탄",
    "투르크메니스탄",
    "러시아",
  ],
  europe: [
    // 서유럽
    "france",
    "germany",
    "italy",
    "spain",
    "portugal",
    "netherlands",
    "belgium",
    "luxembourg",
    "switzerland",
    "austria",
    "ireland",
    "united kingdom",
    // 북유럽
    "sweden",
    "norway",
    "denmark",
    "finland",
    "iceland",
    // 동유럽
    "poland",
    "czechia",
    "hungary",
    "romania",
    "bulgaria",
    "slovakia",
    "slovenia",
    "croatia",
    "ukraine",
    "belarus",
    "moldova",
    "serbia",
    "albania",
    "kosovo",
    "montenegro",
    "bosnia",
    "macedonia",
    // 발트
    "estonia",
    "latvia",
    "lithuania",
    // 기타
    "greece",
    "cyprus",
    "georgia",
    "armenia",
    "azerbaijan",
    // 러시아 (아시아/유럽 모두 포함), 튀르키예
    "russia",
    "turkey",
    // 한국어
    "프랑스",
    "독일",
    "이탈리아",
    "스페인",
    "포르투갈",
    "네덜란드",
    "벨기에",
    "룩셈부르크",
    "스위스",
    "오스트리아",
    "아일랜드",
    "영국",
    "스웨덴",
    "노르웨이",
    "덴마크",
    "핀란드",
    "아이슬란드",
    "폴란드",
    "체코",
    "헝가리",
    "루마니아",
    "불가리아",
    "슬로바키아",
    "슬로베니아",
    "크로아티아",
    "우크라이나",
    "벨라루스",
    "몰도바",
    "세르비아",
    "알바니아",
    "코소보",
    "몬테네그로",
    "보스니아",
    "북마케도니아",
    "에스토니아",
    "라트비아",
    "리투아니아",
    "그리스",
    "키프로스",
    "조지아",
    "아르메니아",
    "아제르바이잔",
    "러시아",
    "튀르키예",
  ],
  americas: [
    // 북아메리카
    "united states",
    "canada",
    "mexico",
    "cuba",
    "jamaica",
    "haiti",
    "dominican",
    "puerto rico",
    "el salvador",
    "guatemala",
    "honduras",
    "nicaragua",
    "panama",
    "costa rica",
    // 남아메리카
    "brazil",
    "argentina",
    "chile",
    "peru",
    "colombia",
    "venezuela",
    "ecuador",
    "bolivia",
    "paraguay",
    "uruguay",
    // 한국어
    "미국",
    "캐나다",
    "멕시코",
    "쿠바",
    "자메이카",
    "아이티",
    "도미니카",
    "푸에르토리코",
    "엘살바도르",
    "과테말라",
    "온두라스",
    "니카라과",
    "파나마",
    "브라질",
    "아르헨티나",
    "칠레",
    "페루",
    "콜롬비아",
    "베네수엘라",
    "에콰도르",
    "볼리비아",
    "파라과이",
    "우루과이",
  ],
  oceania: [
    "australia",
    "new zealand",
    "papua new guinea",
    "fiji",
    "samoa",
    "호주",
    "뉴질랜드",
    "파푸아뉴기니",
    "피지",
    "사모아",
  ],
  middleeast_africa: [
    // 중동
    "saudi arabia",
    "united arab emirates",
    "qatar",
    "kuwait",
    "oman",
    "jordan",
    "israel",
    "lebanon",
    "syria",
    "iraq",
    "iran",
    "yemen",
    "turkey",
    // 북아프리카
    "egypt",
    "morocco",
    "algeria",
    "libya",
    "tunisia",
    "sudan",
    "w. sahara",
    // 동아프리카
    "ethiopia",
    "kenya",
    "tanzania",
    "uganda",
    "rwanda",
    "somalia",
    "djibouti",
    "eritrea",
    "mozambique",
    "madagascar",
    "zambia",
    "zimbabwe",
    "malawi",
    "mauritius",
    // 서아프리카
    "nigeria",
    "ghana",
    "senegal",
    "mali",
    "niger",
    "chad",
    "cameroon",
    "ivory",
    "côte",
    "guinea",
    "liberia",
    "sierra leone",
    "benin",
    "burkina",
    "togo",
    "mauritania",
    "gambia",
    "gabon",
    "congo",
    // 남아프리카
    "south africa",
    "namibia",
    "botswana",
    "angola",
    "lesotho",
    "eswatini",
    // 한국어
    "사우디아라비아",
    "아랍에미리트",
    "카타르",
    "쿠웨이트",
    "오만",
    "요르단",
    "이스라엘",
    "레바논",
    "시리아",
    "이라크",
    "이란",
    "예멘",
    "튀르키예",
    "이집트",
    "모로코",
    "알제리",
    "리비아",
    "튀니지",
    "수단",
    "서사하라",
    "에티오피아",
    "케냐",
    "탄자니아",
    "우간다",
    "르완다",
    "소말리아",
    "지부티",
    "에리트레아",
    "모잠비크",
    "마다가스카르",
    "잠비아",
    "짐바브웨",
    "말라위",
    "모리셔스",
    "나이지리아",
    "가나",
    "세네갈",
    "말리",
    "니제르",
    "차드",
    "카메룬",
    "코트디부아르",
    "기니",
    "라이베리아",
    "시에라리온",
    "베냉",
    "부르키나파소",
    "토고",
    "모리타니",
    "가봉",
    "콩고",
    "남아프리카공화국",
    "나미비아",
    "보츠와나",
    "앙골라",
    "레소토",
    "에스와티니",
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

  // 전체 목록을 한 번에 가져와서 클라이언트에서 필터+페이지네이션 처리
  const { data, isLoading, isError, error, refetch } = useBookmarkList({
    page: 0,
    size: 9999,
  });
  const { mutate: deleteBookmark } = useDeleteBookmark();

  // 제목 검색 + 대륙 필터 AND 적용
  const filteredAll = useMemo(() => {
    if (!data) return [];
    return data.content.filter((item) => {
      const matchesTitle = keyword
        ? (item.title ?? "").toLowerCase().includes(keyword.toLowerCase())
        : true;
      return matchesTitle && matchesContinent(item, continentFilter);
    });
  }, [data, continentFilter, keyword]);

  // 클라이언트 페이지네이션
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAll.length / ITEMS_PER_PAGE),
  );
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAll.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAll, currentPage]);

  const handleFilterChange = (value: string) => {
    setContinentFilter(value as ContinentFilter);
    setCurrentPage(1);
  };

  const handleDelete = (bookmarkId: number) => {
    deleteBookmark(bookmarkId);
  };

  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "#0d1b2e",
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
          <span className="text-white font-medium">저장된 도시</span>
        </nav>

        {/* 헤더 행 */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">
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
                      transition={{
                        duration: 0.3,
                        ease: "easeOut",
                        delay: index * 0.05,
                      }}
                    >
                      <BookmarkCard item={item} onDelete={handleDelete} />
                    </motion.div>
                  ))}

                  {/* AddCityCard는 마지막 페이지에만 */}
                  {currentPage === totalPages && continentFilter === "all" && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        ease: "easeOut",
                        delay: pagedData.length * 0.05,
                      }}
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
