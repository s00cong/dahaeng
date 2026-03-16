package com.example.dahaeng.domain.place.entity;

import com.example.dahaeng.domain.city.entity.City;
import com.example.dahaeng.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "tourist_spot")
public class TouristSpot extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "city_id", nullable = false)
    private City city;

    @Column(name = "tourist_name", length = 50, nullable = false)
    private String touristName;

    private Double lat;
    private Double lon;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "website", columnDefinition = "TEXT")
    private String website;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "sns", columnDefinition = "TEXT")
    private String sns;

    @Column(name = "imageUrl", columnDefinition = "TEXT")
    private String imageUrl;

}
