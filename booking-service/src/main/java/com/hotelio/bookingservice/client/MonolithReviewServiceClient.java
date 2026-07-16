package com.hotelio.bookingservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "reviewservice", url = "${monolith.reviewservice.url}")
public interface MonolithReviewServiceClient {

    @GetMapping("/hotel/{hotelId}/trusted")
    boolean isTrustedHotel(@PathVariable("hotelId") String hotelId);
}
