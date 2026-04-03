import { axiosInstance } from './axiosInstance';
import { z } from 'zod';
import {
  FlightAlertSubscriptionSchema,
  FlightAlertNotificationsPageSchema,
} from '@/schemas/flight-alert.schema';

export const flightAlertApi = {
  getSubscriptions: async () => {
    const { data } = await axiosInstance.get('/api/flight-alerts/subscriptions');
    return z.array(FlightAlertSubscriptionSchema).parse(data);
  },

  upsertSubscription: async (cityId: number, thresholdPrice: number) => {
    const { data } = await axiosInstance.put(
      `/api/flight-alerts/subscriptions/${cityId}`,
      { thresholdPrice },
    );
    return FlightAlertSubscriptionSchema.parse(data);
  },

  deleteSubscription: async (cityId: number) => {
    const { data } = await axiosInstance.delete(
      `/api/flight-alerts/subscriptions/${cityId}`,
    );
    return data as { message: string; id: number };
  },

  getNotifications: async (params?: { page?: number; size?: number }) => {
    const { data } = await axiosInstance.get('/api/flight-alerts/notifications', {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 10,
        sort: 'createdAt,desc',
      },
    });
    return FlightAlertNotificationsPageSchema.parse(data);
  },

  getUnreadCount: async () => {
    const { data } = await axiosInstance.get(
      '/api/flight-alerts/notifications/unread-count',
    );
    return z.object({ count: z.number() }).parse(data);
  },

  markRead: async (notificationId: number) => {
    const { data } = await axiosInstance.patch(
      `/api/flight-alerts/notifications/${notificationId}/read`,
    );
    return data as { message: string; id: number };
  },
};
