package com.example.dahaeng.domain.livingcost.util;

import com.example.dahaeng.domain.livingcost.entity.LivingCostOfCity;

public final class DailyLivingCostCalculator {

    private static final double DAILY_TRANSPORT_TICKET_COUNT = 2.0;

    private DailyLivingCostCalculator() {
    }

    public static DailyLivingCost calculate(
            LivingCostOfCity cost,
            Double usdToKrwRate,
            Double hotelPerDayKrw
    ) {
        if (cost == null) {
            return empty(hotelPerDayKrw);
        }

        return calculate(
                cost.getLunchMenu(),
                cost.getDinnerInAResturantFor2(),
                cost.getCappuccino(),
                cost.getCokePepsi(),
                cost.getLocalTransportTicket(),
                usdToKrwRate,
                hotelPerDayKrw
        );
    }

    public static DailyLivingCost calculate(
            Double lunchMenuUsd,
            Double dinnerInRestaurantFor2Usd,
            Double cappuccinoUsd,
            Double cokePepsiUsd,
            Double localTransportTicketUsd,
            Double usdToKrwRate,
            Double hotelPerDayKrw
    ) {
        double breakfast = toKrw(nz(lunchMenuUsd) * 0.5, usdToKrwRate);
        double lunch = toKrw(nz(lunchMenuUsd), usdToKrwRate);
        double dinner = toKrw(nz(dinnerInRestaurantFor2Usd) / 2.0, usdToKrwRate);
        double cappuccino = toKrw(nz(cappuccinoUsd), usdToKrwRate);
        double cokePepsi = toKrw(nz(cokePepsiUsd), usdToKrwRate);
        double foodTotal = breakfast + lunch + dinner + cappuccino + cokePepsi;

        double localTransportTicket = toKrw(nz(localTransportTicketUsd), usdToKrwRate);
        double transportationTotal = localTransportTicket * DAILY_TRANSPORT_TICKET_COUNT;
        double hotel = Math.round(nz(hotelPerDayKrw));

        return new DailyLivingCost(
                foodTotal + transportationTotal + hotel,
                new FoodCost(foodTotal, breakfast, lunch, dinner, cappuccino, cokePepsi),
                new TransportationCost(transportationTotal, localTransportTicket, DAILY_TRANSPORT_TICKET_COUNT),
                hotel
        );
    }

    private static DailyLivingCost empty(Double hotelPerDayKrw) {
        double hotel = Math.round(nz(hotelPerDayKrw));
        return new DailyLivingCost(
                hotel,
                new FoodCost(0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
                new TransportationCost(0.0, 0.0, DAILY_TRANSPORT_TICKET_COUNT),
                hotel
        );
    }

    private static double toKrw(double usdCost, Double usdToKrwRate) {
        if (usdCost <= 0) {
            return 0.0;
        }
        if (usdToKrwRate == null || usdToKrwRate <= 0) {
            return Math.round(usdCost);
        }
        return Math.round(usdCost * usdToKrwRate);
    }

    private static double nz(Number value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    public record DailyLivingCost(
            double total,
            FoodCost food,
            TransportationCost transportation,
            double hotel
    ) {
    }

    public record FoodCost(
            double total,
            double breakfast,
            double lunch,
            double dinner,
            double cappuccino,
            double cokePepsi
    ) {
    }

    public record TransportationCost(
            double total,
            double localTransportTicket,
            double ticketCount
    ) {
    }
}
