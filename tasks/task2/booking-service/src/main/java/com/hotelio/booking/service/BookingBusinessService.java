package com.hotelio.booking.service;

import com.hotelio.booking.entity.Booking;
import com.hotelio.booking.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BookingBusinessService {
    
    private static final Logger log = LoggerFactory.getLogger(BookingBusinessService.class);
    
    private final BookingRepository bookingRepository;
    private final KafkaService kafkaService;
    
    public BookingBusinessService(BookingRepository bookingRepository, KafkaService kafkaService) {
        this.bookingRepository = bookingRepository;
        this.kafkaService = kafkaService;
    }
    
    public List<Booking> listAll(String userId) {
        if (userId != null) {
            return bookingRepository.findByUserId(userId);
        }
        return bookingRepository.findAll();
    }
    
    public Booking createBooking(String userId, String hotelId, String promoCode) {
        log.info("Creating booking: userId={}, hotelId={}, promoCode={}", userId, hotelId, promoCode);
        
        // Простая логика расчета цены (в реальном проекте здесь была бы сложная валидация)
        double basePrice = 100.0; // Базовая цена
        double discount = 0.0;
        
        if (promoCode != null && !promoCode.isEmpty()) {
            // Простая логика скидки
            discount = basePrice * 0.1; // 10% скидка
        }
        
        double finalPrice = basePrice - discount;
        log.info("Final price calculated: base={}, discount={}, final={}", basePrice, discount, finalPrice);
        
        Booking booking = new Booking(userId, hotelId, promoCode, discount, finalPrice);
        Booking savedBooking = bookingRepository.save(booking);
        
        // Отправляем событие в Kafka
        kafkaService.sendBookingCreatedEvent(userId, hotelId, promoCode, finalPrice, discount);
        
        return savedBooking;
    }
}
