package com.hotelio.monolith.controller;

import com.hotelio.monolith.entity.Hotel;
import com.hotelio.monolith.service.HotelService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hotels")
public class HotelController {

    private final HotelService hotelService;

    public HotelController(HotelService hotelService) {
        this.hotelService = hotelService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Hotel> getHotelById(@PathVariable String id) {
        return hotelService.getHotelById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET /api/hotels/by-ids?ids=h1,h2,h3 - batch-загрузка для DataLoader hotel-subgraph
    @GetMapping("/by-ids")
    public List<Hotel> getHotelsByIds(@RequestParam List<String> ids) {
        return hotelService.getHotelsByIds(ids);
    }

    @GetMapping("/{id}/operational")
    public boolean isOperational(@PathVariable String id) {
        return hotelService.isHotelOperational(id);
    }

    @GetMapping("/{id}/fully-booked")
    public boolean isFullyBooked(@PathVariable String id) {
        return hotelService.isHotelFullyBooked(id);
    }

    @GetMapping("/by-city")
    public List<Hotel> findByCity(@RequestParam String city) {
        return hotelService.findHotelsInCity(city);
    }

    @GetMapping("/top-rated")
    public List<Hotel> topRatedInCity(@RequestParam String city, @RequestParam(defaultValue = "5") int limit) {
        return hotelService.findTopRatedHotelsInCity(city, limit);
    }
}
