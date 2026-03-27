package com.example.dahaeng.domain.recommend.repository;

public interface CityCandidateProjection {
    Long getCityId();
    Long getCountryId();
    String getCityName();
    String getCountryName();
    String getCityImageUrl();
    String getDescription();
    Double getLat();
    Double getLon();
    Double getNewsPenaltyScore();
    Integer getAvgFlightPrice();
    Integer getAvgHotelPrice();
    Double getLunchMenu();
    Double getDinnerInAResturantFor2();
    Double getCappuccino();
    Double getCokePepsi();
    Double getLocalTransportTicket();
    String getDangerAttention();
    String getDangerAttentionPartial();
    String getDangerControl();
    String getDangerLimita();

    String getCurrency();
    String getOriginAirport();
}
