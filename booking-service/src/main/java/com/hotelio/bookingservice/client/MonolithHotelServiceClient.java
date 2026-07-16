package com.hotelio.bookingservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "hotelservice", url = "${monolith.hotelservice.url}")
public interface MonolithHotelServiceClient {

    @GetMapping("/{id}/operational")
    boolean isHotelOperational(@PathVariable("id") String hotelId);

    @GetMapping("/{id}/fully-booked")
    boolean isHotelFullyBooked(@PathVariable("id") String hotelId);
}
