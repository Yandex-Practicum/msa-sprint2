package com.hotelio.dto;

import lombok.Getter;

import java.time.LocalDate;

public record PromoCodeDTO(
        String code,
        double discount,
        boolean vipOnly,
        boolean expired,
        LocalDate validUntil,
        String description
) {
}
