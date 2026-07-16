package com.hotelio.bookingservice.controller;


import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@ConditionalOnProperty(name = "enable.feature.x", havingValue = "true")
public class FeatureController {

    @GetMapping("/feature")
    public String feature() {
        return "Feature X is enabled!";
    }
}
