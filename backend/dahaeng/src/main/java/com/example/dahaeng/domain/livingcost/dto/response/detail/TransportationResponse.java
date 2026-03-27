package com.example.dahaeng.domain.livingcost.dto.response.detail;

public record TransportationResponse(
	Integer localTransportTicket,
	Integer monthlyTicketLocalTransport,
	Integer taxiRide,
	Integer gasPetrol
) {
}
