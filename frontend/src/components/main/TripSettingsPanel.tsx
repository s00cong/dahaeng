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

const MONTHS = [
  { value: 1, label: "1월" },
  { value: 2, label: "2월" },
  { value: 3, label: "3월" },
  { value: 4, label: "4월" },
  { value: 5, label: "5월" },
  { value: 6, label: "6월" },
  { value: 7, label: "7월" },
  { value: 8, label: "8월" },
  { value: 9, label: "9월" },
  { value: 10, label: "10월" },
  { value: 11, label: "11월" },
  { value: 12, label: "12월" },
];

// 현재 연/월을 기준으로 선택 가능 범위를 제한한다.
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
console.log("currentYear:", currentYear, "currentMonth:", currentMonth);
// 현재 연도부터 3개 연도만 보여준다.
const YEARS = [currentYear, currentYear + 1, currentYear + 2];

export function TripSettingsPanel() {
  const {
    setGlobeBudgetFilter,
    setGlobeDuration,
    setGlobeTravelMonth,
    setRecommendActive,
    setRecommendRequest,
  } = useUiStore();

  const [budgetInput, setBudgetInput] = useState<string>("10,000,000");
  const [durationInput, setDurationInput] = useState<string>("2");
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  );

  const { selectedTags } = usePreferenceStore();
  const { mutate: recommend, isPending } = useRecommend();

  // 선택한 연/월이 현재 시점보다 과거인지 검사한다.
  const isPastMonth = useCallback((year: number, month: number) => {
    if (year < currentYear) return true;
    if (year === currentYear && month < currentMonth) return true;
    return false;
  }, []);

  // 연도 변경 시, 현재 선택된 월과 조합해서 과거가 되면 변경하지 않는다.
  const handleYearChange = useCallback(
    (value: string) => {
      const nextYear = Number(value);

      if (isPastMonth(nextYear, selectedMonth)) {
        toast.error("과거는 선택할 수 없습니다.");
        return;
      }

      setSelectedYear(nextYear);
    },
    [isPastMonth, selectedMonth],
  );

  // 월 변경 시, 현재 선택된 연도와 조합해서 과거가 되면 변경하지 않는다.
  const handleMonthChange = useCallback(
    (value: string) => {
      const nextMonth = Number(value);

      console.log({
        selectedYear,
        nextMonth,
        currentYear,
        currentMonth,
        isPast: isPastMonth(selectedYear, nextMonth),
      });

      if (isPastMonth(selectedYear, nextMonth)) {
        console.log("toast called");
        toast.error("과거는 선택할 수 없습니다.");
        return;
      }

      setSelectedMonth(nextMonth);
    },
    [isPastMonth, selectedYear],
  );

  // 초기화 시 현재 연/월로 되돌리고 추천 상태도 해제한다.
  const handleReset = useCallback(() => {
    const now = new Date();

    setBudgetInput("10,000,000");
    setDurationInput("2");
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

  // 예산 입력은 숫자만 허용하고 천 단위 콤마를 붙인다.
  const handleBudgetChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setBudgetInput(formatted);
  }, []);

  // 여행 기간 입력은 숫자만 허용한다.
  const handleDurationChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      setDurationInput(raw);
    },
    [],
  );

  // 현재 입력값이 유효할 때만 전역 상태와 추천 요청을 갱신한다.
  const handleUpdateRecommendations = useCallback(() => {
    const budget = parseInt(budgetInput.replace(/,/g, ""), 10);
    const duration = parseInt(durationInput, 10);

    if (!isNaN(budget) && budget > 0 && !isNaN(duration) && duration > 0) {
      setGlobeBudgetFilter([0, budget]);
      setGlobeDuration(duration);
      setGlobeTravelMonth(selectedYear, selectedMonth);
      setRecommendActive(true);
      setRecommendRequest({
        selectedTags,
        userDailyBudget: budget / duration,
        travelDays: duration,
        month: selectedMonth,
      });
      recommend({
        selectedTags,
        userDailyBudget: budget / duration,
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
    setRecommendRequest,
    recommend,
  ]);

  return (
    <section
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
              {YEARS.map((year) => (
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
              {MONTHS.map(({ value, label }) => (
                <SelectItem key={value} value={String(value)}>
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
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            ₩
          </span>
          <Input
            id="budget-input"
            type="text"
            inputMode="numeric"
            value={budgetInput}
            onChange={handleBudgetChange}
            className="pl-7 text-sm bg-white/70 border-slate-200 focus-visible:ring-blue-300"
            placeholder="5,000,000"
          />
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
