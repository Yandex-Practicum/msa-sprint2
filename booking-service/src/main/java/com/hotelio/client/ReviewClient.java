package com.hotelio.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "review", url = "${clients.review.url}")
public interface ReviewClient {

    @GetMapping("/hotel/{hotelId}/trusted")
    boolean isTrustedHotel(@PathVariable String hotelId);
}
