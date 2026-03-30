import { z } from 'zod';

// ── Legacy schemas (kept for backward compatibility) ─────────────────────────

export const OnePersonCostSchema = z.object({
  totalWithRent: z.number(),
  withoutRent: z.number(),
  rentAndUtilities: z.number(),
  food: z.number(),
  transport: z.number(),
});
export type OnePersonCost = z.infer<typeof OnePersonCostSchema>;

export const FamilyOf4CostSchema = z.object({
  totalWithRent: z.number(),
});
export type FamilyOf4Cost = z.infer<typeof FamilyOf4CostSchema>;

export const CostMetaSchema = z.object({
  lastUpdatedAt: z.string().datetime(),
  source: z.string(),
});

export const CountryCostSchema = z.object({
  countryId: z.number(),
  currency: z.string(),
  onePerson: OnePersonCostSchema,
  familyOf4: FamilyOf4CostSchema,
  salaryAfterTaxMedian: z.number(),
  population: z.number(),
  meta: CostMetaSchema,
});
export type CountryCost = z.infer<typeof CountryCostSchema>;

export const CountryCostSummarySchema = z.object({
  countryId: z.number(),
  countryName: z.string(),
  currency: z.string(),
  avgMonthlyCost: z.number(),
  costIndex: z.number().optional(),
});
export type CountryCostSummary = z.infer<typeof CountryCostSummarySchema>;

export const CityCostSummarySchema = z.object({
  cityId: z.number(),
  cityName: z.string(),
  avgMonthlyCost: z.number(),
  currency: z.string(),
});
export type CityCostSummary = z.infer<typeof CityCostSummarySchema>;

export const ExchangeRateSchema = z.object({
  baseCurrency: z.string(),
  targetCurrency: z.string(),
  rate: z.number(),
  updatedAt: z.string().datetime(),
});
export type ExchangeRate = z.infer<typeof ExchangeRateSchema>;

// ── New API schemas (Aligned with Costapi.md) ──────────────────────────────

// A. GET /api/exchange-rate
export const ExchangeRateNewSchema = z.object({
  target: z.string(),
  event_date: z.string(),
  rate_1krw_to_target: z.number(),
  krw_per_1target: z.number(),
  display_unit: z.number(),
  display_symbol: z.string(),
  krw_per_display_unit: z.number(),
  updatedAt: z.string().optional(),
});
export type ExchangeRateNew = z.infer<typeof ExchangeRateNewSchema>;

// B. GET /api/exchange-rate/history
export const ExchangeRateTrendItemSchema = z.object({
  date: z.string(),
  rate1krwToTarget: z.number(),
  krwPer1target: z.number(),
});
export type ExchangeRateTrendItem = z.infer<typeof ExchangeRateTrendItemSchema>;

export const ExchangeRateLatestSchema = z.object({
  eventDate: z.string(),
  rate1krwToTarget: z.number(),
  krwPer1target: z.number(),
  displayUnit: z.number(),
  displaySymbol: z.string(),
  krwPerDisplayUnit: z.number(),
});
export type ExchangeRateLatest = z.infer<typeof ExchangeRateLatestSchema>;

export const ExchangeRateHistorySchema = z.object({
  baseCurrency: z.string(),
  targetCurrency: z.string(),
  type: z.enum(['D', 'W', 'M']),
  latest: ExchangeRateLatestSchema,
  history: z.array(ExchangeRateTrendItemSchema), // trend -> history 로 변경
});
export type ExchangeRateHistory = z.infer<typeof ExchangeRateHistorySchema>;

// C. GET /api/cost/detail
export const CostEatingOutSchema = z.object({
  lunch_menu: z.number(),
  dinner_in_a_resturant_for_2: z.number(),
  fast_food_meal: z.number(),
  beer_in_a_pub: z.number(),
  cappuccino: z.number(),
  coke_pepsi: z.number(),
});
export type CostEatingOut = z.infer<typeof CostEatingOutSchema>;

export const CostTransportationSchema = z.object({
  local_transport_ticket: z.number(),
  monthly_ticket_local_transport: z.number(),
  taxi_ride: z.number(),
  gas_petrol: z.number(),
});
export type CostTransportation = z.infer<typeof CostTransportationSchema>;

export const CostGroceriesSchema = z.object({
  milk: z.number(),
  bread: z.number(),
  rice: z.number(),
  egg: z.number(),
  chicken: z.number(),
  steak: z.number(),
  apple: z.number(),
  banana: z.number(),
  orange: z.number(),
  tomato: z.number(),
  potato: z.number(),
  onion: z.number(),
  water: z.number(),
  coke: z.number(),
  wine: z.number(),
  beer: z.number(),
  cigarette: z.number(),
  cold_medicine: z.number(),
  shampoo: z.number(),
  toilet_paper: z.number(),
  toothpaste: z.number(),
});
export type CostGroceries = z.infer<typeof CostGroceriesSchema>;

export const CostOtherSchema = z.object({
  gym_month: z.number(),
  cinema_ticket: z.number(),
  haircut: z.number(),
  brand_jeans: z.number(),
  brand_sneakers: z.number(),
});
export type CostOther = z.infer<typeof CostOtherSchema>;

export const LivingCostSchema = z.object({
  id: z.number(),
  daily_budget: z.number(),
  without_rent: z.number(),
  food: z.number(),
  transport: z.number(),
  monthly_salary_after_tax: z.number(),
  population: z.number(),
  eating_out: CostEatingOutSchema,
  transportation: CostTransportationSchema,
  groceries: CostGroceriesSchema,
  other: CostOtherSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type LivingCost = z.infer<typeof LivingCostSchema>;

export const CostTargetSchema = z.object({
  id: z.number(),
  name: z.string(),
  parentRegion: z.string().optional(), // continent -> parentRegion
  currency: z.string().nullish(),
  img_url: z.string().nullable().optional(),
});
export type CostTarget = z.infer<typeof CostTargetSchema>;

export const CostDetailSchema = z.object({
  target_type: z.enum(['country', 'city']),
  target: CostTargetSchema,
  living_cost: LivingCostSchema,
});
export type CostDetail = z.infer<typeof CostDetailSchema>;

// D. GET /api/cost/compare
export const CompareItemSchema = z.object({
  itemKey: z.string(),
  itemName: z.string(),
  basePrice: z.number(), // seoul_price -> basePrice
  targetPrice: z.number(),
  difference: z.number(), // difference_krw -> difference
  differencePercent: z.number(),
});
export type CompareItem = z.infer<typeof CompareItemSchema>;

export const CostCompareSchema = z.object({
  base: CostTargetSchema,
  target: CostTargetSchema,
  costCompare: z.object({
    currency: z.string(),
    baseDailyBudget: z.number(),
    targetDailyBudget: z.number(),
    dailyBudgetGap: z.number(),
    dailyBudgetGapPercent: z.number(),
    summary: z.string().optional(),
  }),
  expectedTargetDailyBudget: z.object({
    currency: z.string(),
    total: z.number(),
    breakdown: z.object({
      food: z.number(),
      transport: z.number(),
      accommodation: z.number().optional(),
    }),
    calculationNotes: z.array(z.string()).optional().default([]),
  }),
  itemComparison: z.object({
    currency: z.string(),
    base: z.string(),
    target: z.string(),
    items: z.array(CompareItemSchema),
  }),
  localCostCompare: z.object({
    currency: z.string(),
    baseLocalDailyCost: z.number(),
    targetLocalDailyCost: z.number(),
    localDailyCostGap: z.number(),
    localDailyCostGapPercent: z.number(),
  }).nullish(),
  affordabilityCompare: z.object({
    currency: z.string(),
    baseDailyIncome: z.number(),
    targetDailyIncome: z.number(),
    baseLocalCostBurdenPercent: z.number(),
    targetLocalCostBurdenPercent: z.number(),
    burdenGapPercentPoint: z.number(),
    targetMoreAffordable: z.boolean(),
  }).nullish(),
});
export type CostCompare = z.infer<typeof CostCompareSchema>;
