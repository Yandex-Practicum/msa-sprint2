package com.hotelio.booking.grpc;

import com.hotelio.booking.service.BookingBusinessService;
import com.hotelio.booking.entity.Booking;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class BookingGrpcService {
    
    private static final Logger log = LoggerFactory.getLogger(BookingGrpcService.class);
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_INSTANT;
    
    private final BookingBusinessService bookingBusinessService;
    
    public BookingGrpcService(BookingBusinessService bookingBusinessService) {
        this.bookingBusinessService = bookingBusinessService;
    }
    
    // Временная реализация - будет заменена на сгенерированный код
    public String createBooking(String userId, String hotelId, String promoCode) {
        log.info("gRPC CreateBooking called: userId={}, hotelId={}, promoCode={}", userId, hotelId, promoCode);
        
        try {
            Booking booking = bookingBusinessService.createBooking(userId, hotelId, promoCode);
            return String.format("{\"id\":\"%d\",\"userId\":\"%s\",\"hotelId\":\"%s\",\"promoCode\":\"%s\",\"discountPercent\":%.2f,\"price\":%.2f,\"createdAt\":\"%s\"}",
                booking.getId(),
                booking.getUserId(),
                booking.getHotelId(),
                booking.getPromoCode() != null ? booking.getPromoCode() : "",
                booking.getDiscountPercent() != null ? booking.getDiscountPercent() : 0.0,
                booking.getPrice(),
                ISO_FORMATTER.format(booking.getCreatedAt())
            );
        } catch (Exception e) {
            log.error("Error creating booking", e);
            throw new RuntimeException("Failed to create booking: " + e.getMessage());
        }
    }
    
    public String listBookings(String userId) {
        log.info("gRPC ListBookings called: userId={}", userId);
        
        try {
            List<Booking> bookings = bookingBusinessService.listAll(userId);
            StringBuilder result = new StringBuilder();
            result.append("{\"bookings\":[");
            
            for (int i = 0; i < bookings.size(); i++) {
                Booking booking = bookings.get(i);
                if (i > 0) result.append(",");
                result.append(String.format("{\"id\":\"%d\",\"userId\":\"%s\",\"hotelId\":\"%s\",\"promoCode\":\"%s\",\"discountPercent\":%.2f,\"price\":%.2f,\"createdAt\":\"%s\"}",
                    booking.getId(),
                    booking.getUserId(),
                    booking.getHotelId(),
                    booking.getPromoCode() != null ? booking.getPromoCode() : "",
                    booking.getDiscountPercent() != null ? booking.getDiscountPercent() : 0.0,
                    booking.getPrice(),
                    ISO_FORMATTER.format(booking.getCreatedAt())
                ));
            }
            
            result.append("]}");
            return result.toString();
        } catch (Exception e) {
            log.error("Error listing bookings", e);
            throw new RuntimeException("Failed to list bookings: " + e.getMessage());
        }
    }
}
