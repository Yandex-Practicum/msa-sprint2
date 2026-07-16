package com.hotelio.bookingservice.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class PromoCode {

    private String code;

    private double discount;
    private boolean vipOnly;
    private boolean expired;

    private LocalDate validUntil;
    private String description;
}
