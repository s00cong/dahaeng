import { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  PlaneTakeoff,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFlightAlertSubscriptions } from "@/hooks/flight-alert/useFlightAlertSubscriptions";
import { useUpsertFlightAlert } from "@/hooks/flight-alert/useUpsertFlightAlert";
import { useDeleteFlightAlert } from "@/hooks/flight-alert/useDeleteFlightAlert";
import dayjs from "@/utils/dayjs";

interface FlightAlertCardProps {
  cityId: number;
  cityName: string;
}

function formatKRW(price: number) {
  return `₩${price.toLocaleString("ko-KR")}`;
}

export function FlightAlertCard({ cityId, cityName }: FlightAlertCardProps) {
  const { data: subscriptions } = useFlightAlertSubscriptions();
  const { mutate: upsert, isPending: isUpserting } = useUpsertFlightAlert();
  const { mutate: deleteAlert, isPending: isDeleting } = useDeleteFlightAlert();

  const subscription = subscriptions?.find(
    (s) => s.cityId === cityId && s.enabled,
  );

  const [inputPrice, setInputPrice] = useState("");

  // 구독이 로드되면 기존 목표가로 input 초기화
  useEffect(() => {
    if (subscription) {
      setInputPrice(String(subscription.thresholdPrice));
    }
  }, [subscription]);

  const handleSave = () => {
    const price = Number(inputPrice.replace(/,/g, ""));
    if (!price || price < 1) return;
    upsert({ cityId, thresholdPrice: price });
  };

  const handleDelete = () => {
    deleteAlert(cityId);
    setInputPrice("");
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <PlaneTakeoff className="size-4 text-blue-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">항공권 알림</p>
          <p className="text-xs text-slate-400">
            {cityName} 목표가 이하 도달 시 알림
          </p>
        </div>
        {subscription && (
          <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-0.5">
            <Bell className="size-3" />
            설정 중
          </span>
        )}
      </div>

      {/* 현재 구독 정보 */}
      {subscription && (
        <div className="mb-4 rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">목표가</span>
            <span className="font-semibold text-slate-800">
              {formatKRW(subscription.thresholdPrice)}
            </span>
          </div>
          {subscription.lastNotifiedPrice != null && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1">
                  <TrendingDown className="size-3.5" />
                  최근 발견가
                </span>
                <span className="font-semibold text-emerald-600">
                  {formatKRW(subscription.lastNotifiedPrice)}
                </span>
              </div>
              {subscription.lastNotifiedAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">알림 시각</span>
                  <span className="text-slate-400">
                    {dayjs(subscription.lastNotifiedAt).format(
                      "YYYY.MM.DD HH:mm",
                    )}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 목표가 입력 */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            ₩
          </span>
          <input
            type="number"
            min={1}
            value={inputPrice}
            onChange={(e) => setInputPrice(e.target.value)}
            placeholder="목표 금액 입력"
            className="w-full pl-7 pr-3 py-2 text-sm rounded-lg bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
          />
        </div>
        <Button
          size="sm"
          disabled={!inputPrice || isUpserting}
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-500 text-white shrink-0"
        >
          {isUpserting ? "저장 중..." : subscription ? "수정" : "설정"}
        </Button>
      </div>

      {/* 해제 버튼 */}
      {subscription && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          <BellOff className="size-3.5" />
          {isDeleting ? "해제 중..." : "알림 해제"}
        </button>
      )}

      {!subscription && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <CheckCircle2 className="size-3.5" />
          목표가 이하 항공권 발견 시 알림을 보내드립니다
        </div>
      )}
    </div>
  );
}
