import type {
  ExchangeRateNew,
  ExchangeRateHistory,
  CostDetail,
  CostCompare,
} from '@/schemas/cost.schema';

// ── A. /api/exchange-rate?currency=JPY ───────────────────────────────────────
export const DUMMY_EXCHANGE_RATE: ExchangeRateNew = {
  target: 'JPY',
  event_date: '2026-03-08',
  rate_1krw_to_target: 0.11,
  krw_per_1target: 9.09,
  display_unit: 100,
  display_symbol: 'JPY(100)',
  krw_per_display_unit: 909.0,
  updatedAt: '2026-03-08T01:00:00Z',
};

// ── B. /api/exchange-rate/history (일별/주별/월별) ────────────────────────────
const EXCHANGE_LATEST = {
  eventDate: '2026-03-08',
  rate1krwToTarget: 0.11,
  krwPer1target: 9.09,
  displayUnit: 100,
  displaySymbol: 'JPY(100)',
  krwPerDisplayUnit: 909.0,
};

export const DUMMY_EXCHANGE_RATE_HISTORY_D: ExchangeRateHistory = {
  baseCurrency: 'KRW',
  targetCurrency: 'JPY',
  type: 'D',
  latest: EXCHANGE_LATEST,
  history: [
    { date: '2026-03-02', rate1krwToTarget: 0.108, krwPer1target: 9.26 },
    { date: '2026-03-03', rate1krwToTarget: 0.109, krwPer1target: 9.17 },
    { date: '2026-03-04', rate1krwToTarget: 0.109, krwPer1target: 9.17 },
    { date: '2026-03-05', rate1krwToTarget: 0.108, krwPer1target: 9.26 },
    { date: '2026-03-06', rate1krwToTarget: 0.110, krwPer1target: 9.09 },
    { date: '2026-03-07', rate1krwToTarget: 0.111, krwPer1target: 9.01 },
    { date: '2026-03-08', rate1krwToTarget: 0.110, krwPer1target: 9.09 },
  ],
};

export const DUMMY_EXCHANGE_RATE_HISTORY_W: ExchangeRateHistory = {
  baseCurrency: 'KRW',
  targetCurrency: 'JPY',
  type: 'W',
  latest: EXCHANGE_LATEST,
  history: [
    { date: '2026-01-19', rate1krwToTarget: 0.106, krwPer1target: 9.43 },
    { date: '2026-01-26', rate1krwToTarget: 0.107, krwPer1target: 9.35 },
    { date: '2026-02-02', rate1krwToTarget: 0.108, krwPer1target: 9.26 },
    { date: '2026-02-09', rate1krwToTarget: 0.109, krwPer1target: 9.17 },
    { date: '2026-02-16', rate1krwToTarget: 0.110, krwPer1target: 9.09 },
    { date: '2026-02-23', rate1krwToTarget: 0.111, krwPer1target: 9.01 },
    { date: '2026-03-02', rate1krwToTarget: 0.110, krwPer1target: 9.09 },
  ],
};

export const DUMMY_EXCHANGE_RATE_HISTORY_M: ExchangeRateHistory = {
  baseCurrency: 'KRW',
  targetCurrency: 'JPY',
  type: 'M',
  latest: EXCHANGE_LATEST,
  history: [
    { date: '2025-09-01', rate1krwToTarget: 0.104, krwPer1target: 9.62 },
    { date: '2025-10-01', rate1krwToTarget: 0.105, krwPer1target: 9.52 },
    { date: '2025-11-01', rate1krwToTarget: 0.107, krwPer1target: 9.35 },
    { date: '2025-12-01', rate1krwToTarget: 0.108, krwPer1target: 9.26 },
    { date: '2026-01-01', rate1krwToTarget: 0.109, krwPer1target: 9.17 },
    { date: '2026-02-01', rate1krwToTarget: 0.111, krwPer1target: 9.01 },
    { date: '2026-03-01', rate1krwToTarget: 0.110, krwPer1target: 9.09 },
  ],
};

// ── Seoul 기준 더미 (city_id=1) ───────────────────────────────────────────────
export const DUMMY_SEOUL_COST_DETAIL: CostDetail = {
  target_type: 'city',
  target: { id: 1, name: 'Seoul', parentRegion: 'Asia', currency: 'KRW' },
  living_cost: {
    id: 1,
    daily_budget: 55.0,
    without_rent: 780.0,
    food: 320.0,
    transport: 90.0,
    monthly_salary_after_tax: 2500.0,
    population: 9776000,
    eating_out: {
      lunch_menu: 8.0,
      dinner_in_a_resturant_for_2: 48.0,
      fast_food_meal: 6.5,
      beer_in_a_pub: 4.5,
      cappuccino: 4.2,
      coke_pepsi: 1.7,
    },
    transportation: {
      local_transport_ticket: 1.4,
      monthly_ticket_local_transport: 55.0,
      taxi_ride: 9.5,
      gas_petrol: 1.55,
    },
    groceries: {
      milk: 2.0, bread: 2.2, rice: 3.0, egg: 2.0,
      chicken: 5.5, steak: 12.0, apple: 3.5, banana: 1.8,
      orange: 3.0, tomato: 2.5, potato: 1.5, onion: 1.3,
      water: 0.7, coke: 1.5, wine: 10.0, beer: 2.0,
      cigarette: 4.5, cold_medicine: 7.0, shampoo: 5.0,
      toilet_paper: 2.8, toothpaste: 2.5,
    },
    other: {
      gym_month: 38.0,
      cinema_ticket: 10.0,
      haircut: 14.0,
      brand_jeans: 65.0,
      brand_sneakers: 85.0,
    },
    created_at: '2026-03-08T10:00:00',
    updated_at: '2026-03-08T10:00:00',
  },
};

// ── C. /api/cost/detail?target_type=city&target_id=120 ───────────────────────
export const DUMMY_COST_DETAIL: CostDetail = {
  target_type: 'city',
  target: {
    id: 120,
    name: 'Tokyo',
    parentRegion: 'Asia',
    currency: 'JPY',
    img_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400',
  },
  living_cost: {
    id: 15,
    daily_budget: 73.4,
    without_rent: 980.0,
    food: 420.0,
    transport: 130.0,
    monthly_salary_after_tax: 2200.0,
    population: 13960000,
    eating_out: {
      lunch_menu: 10.0,
      dinner_in_a_resturant_for_2: 55.0,
      fast_food_meal: 7.5,
      beer_in_a_pub: 5.2,
      cappuccino: 4.0,
      coke_pepsi: 2.0,
    },
    transportation: {
      local_transport_ticket: 2.3,
      monthly_ticket_local_transport: 80.0,
      taxi_ride: 14.0,
      gas_petrol: 1.6,
    },
    groceries: {
      milk: 1.8,
      bread: 2.4,
      rice: 3.5,
      egg: 2.2,
      chicken: 7.8,
      steak: 18.0,
      apple: 3.2,
      banana: 1.5,
      orange: 2.8,
      tomato: 2.4,
      potato: 1.6,
      onion: 1.3,
      water: 0.9,
      coke: 1.8,
      wine: 14.0,
      beer: 2.8,
      cigarette: 5.5,
      cold_medicine: 8.0,
      shampoo: 6.0,
      toilet_paper: 3.5,
      toothpaste: 3.0,
    },
    other: {
      gym_month: 50.0,
      cinema_ticket: 13.0,
      haircut: 22.0,
      brand_jeans: 80.0,
      brand_sneakers: 105.0,
    },
    created_at: '2026-03-08T10:00:00',
    updated_at: '2026-03-08T10:00:00',
  },
};

// ── D. /api/cost/compare ────────────────────────────────────────────────────
export const DUMMY_COST_COMPARE: CostCompare = {
  base: {
    id: 1,
    name: 'Seoul',
    parentRegion: 'South Korea',
    currency: 'KRW',
  },
  target: {
    id: 120,
    name: 'Tokyo',
    parentRegion: 'Japan',
    currency: 'JPY',
  },
  costCompare: {
    currency: 'KRW',
    baseDailyBudget: 150000,
    targetDailyBudget: 180000,
    dailyBudgetGap: 30000,
    dailyBudgetGapPercent: 20.0,
  },
  expectedTargetDailyBudget: {
    currency: 'KRW',
    total: 180000,
    breakdown: {
      food: 50000,
      transport: 15000,
      accommodation: 115000,
    },
    calculationNotes: [
      'food = estimated breakfast + lunch + dinner',
      'transport = average daily local transport usage',
      'accommodation = average 1 night stay cost',
    ],
  },
  itemComparison: {
    currency: 'KRW',
    base: 'Seoul',
    target: 'Tokyo',
    items: [
      { itemKey: 'lunch_menu', itemName: '점심 식사', basePrice: 12000, targetPrice: 15000, difference: 3000, differencePercent: 25.0 },
      { itemKey: 'dinner_for_2', itemName: '저녁비 (2인)', basePrice: 70000, targetPrice: 82000, difference: 12000, differencePercent: 17.1 },
      { itemKey: 'big_mac', itemName: '빅맥지수', basePrice: 5500, targetPrice: 6200, difference: 700, differencePercent: 12.7 },
      { itemKey: 'cappuccino', itemName: '카푸치노', basePrice: 4800, targetPrice: 5600, difference: 800, differencePercent: 16.7 },
      { itemKey: 'coke', itemName: '콜라', basePrice: 2200, targetPrice: 2500, difference: 300, differencePercent: 13.6 },
      { itemKey: 'bus_ticket', itemName: '버스비', basePrice: 1500, targetPrice: 2100, difference: 600, differencePercent: 40.0 },
      { itemKey: 'taxi_8km', itemName: '택시비 (8km)', basePrice: 12000, targetPrice: 18500, difference: 6500, differencePercent: 54.2 },
      { itemKey: 'brand_jeans', itemName: '브랜드 청바지', basePrice: 89000, targetPrice: 97000, difference: 8000, differencePercent: 9.0 },
      { itemKey: 'brand_sneakers', itemName: '브랜드 운동화', basePrice: 110000, targetPrice: 128000, difference: 18000, differencePercent: 16.4 },
    ],
  },
};
