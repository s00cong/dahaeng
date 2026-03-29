import { useState, useCallback, type ChangeEvent } from "react";
import { SlidersHorizontal, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUiStore } from "@/stores/uiStore";
import { usePreferenceStore } from "@/stores/preferenceStore";
import { useRecommend } from "@/hooks/city/useRecommend";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// 현재 월부터 6개월치 유효한 year/month 쌍 생성
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

const VALID_MONTHS: { year: number; month: number; label: string }[] = Array.from({ length: 6 }, (_, i) => {
  const date = new Date(currentYear, currentMonth - 1 + i);
  return { year: date.getFullYear(), month: date.getMonth() + 1, label: `${date.getMonth() + 1}월` };
});

const VALID_YEARS = [...new Set(VALID_MONTHS.map((m) => m.year))];

export function TripSettingsPanel() {
  const {
    setGlobeBudgetFilter,
    setGlobeDuration,
    setGlobeTravelMonth,
    setRecommendActive,
    setRecommendError,
  } = useUiStore();

  const [budgetInput, setBudgetInput] = useState<string>("");
  const [durationInput, setDurationInput] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  );

  const { selectedTags } = usePreferenceStore();
  const { mutate: recommend, isPending } = useRecommend();

  // 연도 변경 시, 해당 연도의 첫 번째 유효한 월로 자동 이동
  const handleYearChange = useCallback((value: string) => {
    const nextYear = Number(value);
    setSelectedYear(nextYear);
    const firstValidMonth = VALID_MONTHS.find((m) => m.year === nextYear)?.month;
    if (firstValidMonth) setSelectedMonth(firstValidMonth);
  }, []);

  // 월 변경
  const handleMonthChange = useCallback((value: string) => {
    setSelectedMonth(Number(value));
  }, []);

  // 초기화 시 현재 연/월로 되돌리고 추천 상태도 해제한다.
  const handleReset = useCallback(() => {
    const now = new Date();

    setBudgetInput("");
    setDurationInput("");
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);

    setGlobeBudgetFilter([0, 5_000_000]);
    setGlobeDuration(2);
    setGlobeTravelMonth(now.getFullYear(), now.getMonth() + 1);
    setRecommendActive(false);
  }, [
    setGlobeBudgetFilter,
    setGlobeDuration,
    setGlobeTravelMonth,
    setRecommendActive,
  ]);

  // 예산 입력 — 만원 단위, 최대 1500만원
  const handleBudgetChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    if (digits === "") { setBudgetInput(""); return; }
    const num = parseInt(digits, 10);
    if (num > 1500) {
      toast.error("예산은 최대 1,500만원까지 입력할 수 있습니다.");
      return;
    }
    const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setBudgetInput(formatted);
  }, []);

  // 여행 기간 입력 — 최대 30일
  const handleDurationChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/[^0-9]/g, "");
      if (digits === "") { setDurationInput(""); return; }
      const num = parseInt(digits, 10);
      if (num > 30) {
        toast.error("여행 기간은 최대 30일까지 입력할 수 있습니다.");
        return;
      }
      setDurationInput(digits);
    },
    [],
  );

  // 현재 입력값이 유효할 때만 전역 상태와 추천 요청을 갱신한다.
  const handleUpdateRecommendations = useCallback(() => {
    const budgetMan = parseInt(budgetInput.replace(/,/g, ""), 10); // 만원 단위
    const budget = budgetMan * 10_000; // 원 단위로 변환
    const duration = parseInt(durationInput, 10);

    if (isNaN(budgetMan) || budgetMan <= 0) {
      toast.error("예산을 입력해 주세요.");
      return;
    }
    if (isNaN(duration) || duration <= 0) {
      toast.error("여행 기간을 입력해 주세요.");
      return;
    }
    if (!isNaN(budgetMan) && budgetMan > 0 && !isNaN(duration) && duration > 0) {
      setGlobeBudgetFilter([0, budget]);
      setGlobeDuration(duration);
      setGlobeTravelMonth(selectedYear, selectedMonth);
      setRecommendActive(true);
      setRecommendError(false);
      recommend({
        selectedTags,
        userTotalBudget: budget,
        travelDays: duration,
        month: selectedMonth,
      });
    }
  }, [
    budgetInput,
    durationInput,
    selectedYear,
    selectedMonth,
    selectedTags,
    setGlobeBudgetFilter,
    setGlobeDuration,
    setGlobeTravelMonth,
    setRecommendActive,
    setRecommendError,
    recommend,
  ]);

  return (
    <section
      data-tutorial="trip-settings"
      className={cn(
        "bg-white/85 backdrop-blur-md rounded-2xl shadow-lg p-4",
        "flex flex-col gap-4",
      )}
      aria-label="여행 설정"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="size-4 text-blue-500"
            aria-hidden="true"
          />
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            여행 설정
          </h2>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          초기화
        </button>
      </div>
      {/* 여행 월 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          여행 월
        </label>
        <div className="flex gap-2">
          <Select value={String(selectedYear)} onValueChange={handleYearChange}>
            <SelectTrigger className="flex-1 text-sm bg-white/70 border-slate-200 focus:ring-blue-300">
              <SelectValue placeholder="년도" />
            </SelectTrigger>
            <SelectContent>
              {VALID_YEARS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(selectedMonth)}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="flex-1 text-sm bg-white/70 border-slate-200 focus:ring-blue-300">
              <SelectValue placeholder="월" />
            </SelectTrigger>
            <SelectContent>
              {VALID_MONTHS.filter((m) => m.year === selectedYear).map(({ month, label }) => (
                <SelectItem key={month} value={String(month)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* 예산 */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="budget-input"
          className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
        >
          1인당 예산
        </label>
        <div className="relative">
          <Input
            id="budget-input"
            type="text"
            inputMode="numeric"
            value={budgetInput}
            onChange={handleBudgetChange}
            className="pr-12 text-sm bg-white/70 border-slate-200 focus-visible:ring-blue-300"
            placeholder="-"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
            만원
          </span>
        </div>
      </div>
      {/* 여행 기간 */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="duration-input"
          className="text-xs font-semibold text-slate-500 uppercase tracking-wide"
        >
          여행 기간 (일)
        </label>
        <Input
          id="duration-input"
          type="text"
          inputMode="numeric"
          value={durationInput}
          onChange={handleDurationChange}
          className="text-sm bg-white/70 border-slate-200 focus-visible:ring-blue-300"
          placeholder="-"
        />
      </div>
      {/* 추천 업데이트 버튼 */}
      <Button
        onClick={handleUpdateRecommendations}
        disabled={isPending}
        variant="primary"
        className="w-full"
        aria-label="추천 여행지 업데이트"
      >
        {isPending ? (
          <>
            <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
            업데이트 중...
          </>
        ) : (
          <>
            <RefreshCw className="size-4" aria-hidden="true" />
            추천 업데이트
          </>
        )}
      </Button>
    </section>
  );
}
