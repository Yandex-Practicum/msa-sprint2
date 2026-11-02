package com.hotelio.dto;

import jakarta.persistence.Column;

public record HotelDTO(
        String id,
        boolean operational,
        boolean fullyBooked,
        String city,
        double rating,
        String description) {
}
