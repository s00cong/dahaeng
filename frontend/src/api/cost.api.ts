import { axiosInstance } from './axiosInstance';
import { ApiResponseSchema } from '@/schemas/common.schema';
import {
  CountryCostSchema,
  CountryCostSummarySchema,
  CityCostSummarySchema,
  ExchangeRateSchema,
  ExchangeRateNewSchema,
  ExchangeRateHistorySchema,
  CostDetailSchema,
  CostCompareSchema,
  type ExchangeRateNew,
  type ExchangeRateHistory,
  type CostDetail,
  type CostCompare,
} from '@/schemas/cost.schema';
import {
  DUMMY_EXCHANGE_RATE,
  DUMMY_EXCHANGE_RATE_HISTORY_D,
  DUMMY_EXCHANGE_RATE_HISTORY_W,
  DUMMY_EXCHANGE_RATE_HISTORY_M,
  DUMMY_COST_DETAIL,
  DUMMY_SEOUL_COST_DETAIL,
  DUMMY_COST_COMPARE,
} from '@/data/cost.dummy';
import { z } from 'zod';

export const SEOUL_CITY_ID = 162;
export const SEOUL_COUNTRY_ID = 58; // South Korea

export type CostCardItem = {
  rank: number;
  id: number;
  name: string;
  imgUrl: string | null;
  dailyBudget: number; // KRW
};

const DUMMY_HISTORY_MAP = {
  d: DUMMY_EXCHANGE_RATE_HISTORY_D,
  w: DUMMY_EXCHANGE_RATE_HISTORY_W,
  m: DUMMY_EXCHANGE_RATE_HISTORY_M,
};

// ── API 응답 스키마 정의 (공통 래퍼 적용) ───────────────────────────────────
const CountryCostApiSchema = ApiResponseSchema(CountryCostSchema);
const CountryCostSummaryApiSchema = ApiResponseSchema(CountryCostSummarySchema);
const CityCostSummaryListApiSchema = ApiResponseSchema(z.array(CityCostSummarySchema));
const ExchangeRateApiSchema = ApiResponseSchema(ExchangeRateSchema);


export const costApi = {
  // ── Legacy endpoints ───────────────────────────────────────────────────────

  getCountryCost: async (countryId: number) => {
    const { data } = await axiosInstance.get(`/api/cost/countries/${countryId}`);
    return CountryCostApiSchema.parse(data).data;
  },

  getCountryCostSummary: async (countryId: number) => {
    const { data } = await axiosInstance.get(`/api/cost/countries/${countryId}/summary`);
    return CountryCostSummaryApiSchema.parse(data).data;
  },

  getCityCostListByCountry: async (countryId: number) => {
    const { data } = await axiosInstance.get(`/api/cost/countries/${countryId}/cities`);
    return CityCostSummaryListApiSchema.parse(data).data;
  },

  getExchangeRate: async (baseCurrency: string, targetCurrency: string) => {
    const { data } = await axiosInstance.get('/api/cost/exchange', {
      params: { base: baseCurrency, target: targetCurrency },
    });
    return ExchangeRateApiSchema.parse(data).data;
  },

  // ── New endpoints (Costapi.md) ─────────────────────────────────────────────

  // GET /api/exchange-rate?currency=XXX
  getExchangeRateNew: async (currency: string): Promise<ExchangeRateNew> => {
    try {
      const { data } = await axiosInstance.get('/api/exchange-rate', { params: { currency } });
      return ExchangeRateNewSchema.parse({
        target: String(data.target),
        event_date: data.eventDate,
        rate_1krw_to_target: Number(data.rate1krwToTarget),
        krw_per_1target: Number(data.krwPer1target),
        display_unit: data.displayUnit,
        display_symbol: data.displaySymbol,
        krw_per_display_unit: Number(data.krwPerDisplayUnit),
        updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
      });
    } catch {
      return { ...DUMMY_EXCHANGE_RATE, target: currency };
    }
  },

  // GET /api/exchange-rate/history?targetCurrency=XXX&type=D|W|M
  getExchangeRateHistory: async (
    targetCurrency: string,
    type: 'D' | 'W' | 'M',
  ): Promise<ExchangeRateHistory> => {
    try {
      const { data } = await axiosInstance.get('/api/exchange-rate/history', {
        params: { targetCurrency, type },
      });
      return ExchangeRateHistorySchema.parse(data);
    } catch {
      const dummy = DUMMY_HISTORY_MAP[type.toLowerCase() as 'd' | 'w' | 'm'];
      return { ...dummy, targetCurrency };
    }
  },

  // GET /api/cost/detail?targetType=CITY|COUNTRY&targetId=XXX
  getCostDetail: async (
    targetType: 'country' | 'city',
    targetId: number,
  ): Promise<CostDetail> => {
    try {
      const { data } = await axiosInstance.get('/api/cost/detail', {
        params: { targetType: targetType.toUpperCase(), targetId },
      });
      const lc = data.livingCost;
      return CostDetailSchema.parse({
        target_type: data.targetType,
        target: {
          id: Number(data.target.id),
          name: data.target.name,
          parentRegion: data.target.parentRegion,
          currency: data.target.currency,
          img_url: data.target.imgUrl ?? null,
        },
        living_cost: {
          id: Number(lc.id),
          daily_budget: lc.dailyBudget,
          without_rent: lc.withoutRent,
          food: lc.food,
          transport: lc.transport,
          monthly_salary_after_tax: lc.monthlySalaryAfterTax,
          population: lc.population,
          eating_out: {
            lunch_menu: lc.eatingOut.lunchMenu,
            dinner_in_a_resturant_for_2: lc.eatingOut.dinnerInAResturantFor2,
            fast_food_meal: lc.eatingOut.fastFoodMeal,
            beer_in_a_pub: lc.eatingOut.beerInAPub,
            cappuccino: lc.eatingOut.cappuccino,
            coke_pepsi: lc.eatingOut.cokePepsi,
          },
          transportation: {
            local_transport_ticket: lc.transportation.localTransportTicket,
            monthly_ticket_local_transport: lc.transportation.monthlyTicketLocalTransport,
            taxi_ride: lc.transportation.taxiRide,
            gas_petrol: lc.transportation.gasPetrol,
          },
          groceries: {
            milk: lc.groceries.milk,
            bread: lc.groceries.bread,
            rice: lc.groceries.rice,
            egg: lc.groceries.egg,
            chicken: lc.groceries.chicken,
            steak: lc.groceries.steak,
            apple: lc.groceries.apple,
            banana: lc.groceries.banana,
            orange: lc.groceries.orange,
            tomato: lc.groceries.tomato,
            potato: lc.groceries.potato,
            onion: lc.groceries.onion,
            water: lc.groceries.water,
            coke: lc.groceries.coke,
            wine: lc.groceries.wine,
            beer: lc.groceries.beer,
            cigarette: lc.groceries.cigarette,
            cold_medicine: lc.groceries.coldMedicine,
            shampoo: lc.groceries.shampoo,
            toilet_paper: lc.groceries.toiletPaper,
            toothpaste: lc.groceries.toothpaste,
          },
          other: {
            gym_month: lc.other.gymMonth,
            cinema_ticket: lc.other.cinemaTicket,
            haircut: lc.other.haircut,
            brand_jeans: lc.other.brandJeans,
            brand_sneakers: lc.other.brandSneakers,
          },
          created_at: lc.createdAt,
          updated_at: lc.updatedAt,
        },
      });
    } catch {
      if (targetId === SEOUL_CITY_ID) return DUMMY_SEOUL_COST_DETAIL;
      return {
        ...DUMMY_COST_DETAIL,
        target: { ...DUMMY_COST_DETAIL.target, id: targetId },
      };
    }
  },

  // GET /api/cost/card?mode=TOP
  getCostCard: async (): Promise<CostCardItem[]> => {
    try {
      const { data } = await axiosInstance.get('/api/cost/card', {
        params: { mode: 'TOP' },
      });
      return (data.cards as CostCardItem[]).map((c) => ({
        rank: c.rank ?? 0,
        id: c.id,
        name: c.name,
        imgUrl: c.imgUrl ?? null,
        dailyBudget: c.dailyBudget,
      }));
    } catch {
      return [];
    }
  },

  // GET /api/cost/card?mode=SEARCH&type=CONTINENT|COUNTRY&keyword=...&sort=ASC|DESC
  getCostSearch: async (
    type: 'CONTINENT' | 'COUNTRY',
    keyword: string,
    sort: 'ASC' | 'DESC' = 'ASC',
  ): Promise<CostCardItem[]> => {
    try {
      const { data } = await axiosInstance.get('/api/cost/card', {
        params: { mode: 'SEARCH', type, keyword, sort },
      });
      return (data.cards as CostCardItem[]).map((c, i) => ({
        rank: i + 1,
        id: c.id,
        name: c.name,
        imgUrl: c.imgUrl ?? null,
        dailyBudget: c.dailyBudget,
      }));
    } catch {
      return [];
    }
  },

  // GET /api/cost/compare?targetType=CITY&baseId=12&targetId=XXX
  getCostCompare: async (
    targetType: 'COUNTRY' | 'CITY',
    baseId: number,
    targetId: number,
  ): Promise<CostCompare> => {
    try {
      const { data } = await axiosInstance.get('/api/cost/compare', {
        params: { targetType, baseId, targetId },
      });
      return CostCompareSchema.parse({
        base: { ...data.base, img_url: data.base.imgUrl ?? null },
        target: { ...data.target, img_url: data.target.imgUrl ?? null },
        costCompare: data.costCompare,
        expectedTargetDailyBudget: data.expectedTargetDailyBudget,
        itemComparison: data.itemComparison,
      });
    } catch {
      return {
        ...DUMMY_COST_COMPARE,
        target: { ...DUMMY_COST_COMPARE.target, id: targetId },
      };
    }
  },
};
