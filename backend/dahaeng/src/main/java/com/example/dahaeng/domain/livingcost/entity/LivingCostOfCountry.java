package com.example.dahaeng.domain.livingcost.entity;
import com.example.dahaeng.domain.country.entity.Country;
import com.example.dahaeng.global.entity.BaseEntity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "living_cost_of_country")
public class LivingCostOfCountry extends BaseEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "country_id", nullable = false)
	private Country country;

	@Column(name = "daily_budget")
	private Double dailyBudget;

	@Column(name = "without_rent")
	private Double withoutRent;

	private Double food;
	private Double transport;

	@Column(name = "monthly_salary_after_tax")
	private Double monthlySalaryAfterTax;

	private Double population;

	@Column(name = "lunch_menu")
	private Double lunchMenu;

	@Column(name = "dinner_in_a_resturant_for_2")
	private Double dinnerInAResturantFor2;

	@Column(name = "fast_food_meal")
	private Double fastFoodMeal;

	@Column(name = "beer_in_a_pub")
	private Double beerInAPub;

	private Double cappuccino;

	@Column(name = "coke_pepsi")
	private Double cokePepsi;

	@Column(name = "local_transport_ticket")
	private Double localTransportTicket;

	@Column(name = "monthly_ticket_local_transport")
	private Double monthlyTicketLocalTransport;

	@Column(name = "taxi_ride")
	private Double taxiRide;

	@Column(name = "gas_petrol")
	private Double gasPetrol;

	private Double milk;
	private Double bread;
	private Double rice;
	private Double egg;
	private Double chicken;
	private Double steak;
	private Double apple;
	private Double banana;
	private Double orange;
	private Double tomato;
	private Double potato;
	private Double onion;
	private Double water;
	private Double coke;
	private Double wine;
	private Double beer;
	private Double cigarette;

	@Column(name = "cold_medicine")
	private Double coldMedicine;

	private Double shampoo;

	@Column(name = "toilet_paper")
	private Double toiletPaper;

	private Double toothpaste;

	@Column(name = "gym_month")
	private Double gymMonth;

	@Column(name = "cinema_ticket")
	private Double cinemaTicket;

	private Double haircut;

	@Column(name = "brand_jeans")
	private Double brandJeans;

	@Column(name = "brand_sneakers")
	private Double brandSneakers;
}
