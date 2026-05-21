package com.hotelio.monolith.controller;

import com.hotelio.monolith.entity.Review;
import com.hotelio.monolith.repository.ReviewRepository;
import com.hotelio.monolith.service.ReviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;
    private final ReviewRepository reviewRepository;

    public ReviewController(ReviewService reviewService,
                            ReviewRepository reviewRepository) {
        this.reviewService = reviewService;
        this.reviewRepository = reviewRepository;
    }

    // GET /api/reviews/hotel/{hotelId}
    @GetMapping("/hotel/{hotelId}")
    public List<Review> getReviewsForHotel(@PathVariable String hotelId) {
        return reviewRepository.findByHotelId(hotelId);
    }

    // GET /api/reviews/hotel/{hotelId}/trusted
    @GetMapping("/hotel/{hotelId}/trusted")
    public boolean isHotelTrusted(@PathVariable String hotelId) {
        return reviewService.isTrustedHotel(hotelId);
    }
}
