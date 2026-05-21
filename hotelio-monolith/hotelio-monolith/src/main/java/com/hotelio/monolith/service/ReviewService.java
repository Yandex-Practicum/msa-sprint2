package com.hotelio.monolith.service;

import com.hotelio.monolith.entity.Review;
import com.hotelio.monolith.repository.ReviewRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;


@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;

    public ReviewService(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    public boolean isTrustedHotel(String hotelId) {
        Optional<ReviewAggregate> aggregate = getAggregateForHotel(hotelId);
        return aggregate.map(agg ->
                agg.getAvgRating() >= 4.0 && agg.getReviewCount() >= 10
        ).orElse(false);
    }

    private Optional<ReviewAggregate> getAggregateForHotel(String hotelId) {
        List<Review> reviews = reviewRepository.findByHotelId(hotelId);
        if (reviews.isEmpty()) return Optional.empty();

        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0);
        return Optional.of(new ReviewAggregate(avg, reviews.size()));
    }

    private static class ReviewAggregate {
        private final double avgRating;
        private final int reviewCount;

        public ReviewAggregate(double avgRating, int reviewCount) {
            this.avgRating = avgRating;
            this.reviewCount = reviewCount;
        }

        public double getAvgRating() {
            return avgRating;
        }

        public int getReviewCount() {
            return reviewCount;
        }
    }
}
