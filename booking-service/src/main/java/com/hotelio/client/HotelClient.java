package com.hotelio.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "hotel", url = "${clients.hotel.url}")
public interface HotelClient {

    @GetMapping("/{id}/operational")
    boolean isOperational(@PathVariable String id);

    @GetMapping("/{id}/fully-booked")
    boolean isHotelFullyBooked(@PathVariable String id);
}
