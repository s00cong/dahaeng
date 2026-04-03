import { z } from 'zod';

export const FlightAlertSubscriptionSchema = z.object({
  subscriptionId: z.number(),
  cityId: z.number(),
  cityName: z.string(),
  countryName: z.string(),
  thresholdPrice: z.number(),
  enabled: z.boolean(),
  lastNotifiedPrice: z.number().nullable(),
  lastNotifiedAt: z.string().nullable(),
});
export type FlightAlertSubscription = z.infer<typeof FlightAlertSubscriptionSchema>;

export const FlightAlertNotificationSchema = z.object({
  notificationId: z.number(),
  cityId: z.number(),
  cityName: z.string(),
  alertType: z.enum(['TARGET_HIT', 'NEAR_TARGET']),
  thresholdPrice: z.number(),
  matchedPrice: z.number(),
  nearestMatchDate: z.string(),
  bestPriceDate: z.string(),
  matchedDateCount: z.number(),
  collectedAt: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type FlightAlertNotification = z.infer<typeof FlightAlertNotificationSchema>;

export const FlightAlertNotificationsPageSchema = z.object({
  content: z.array(FlightAlertNotificationSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
});
export type FlightAlertNotificationsPage = z.infer<typeof FlightAlertNotificationsPageSchema>;
