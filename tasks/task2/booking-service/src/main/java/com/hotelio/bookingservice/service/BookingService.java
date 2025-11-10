package com.hotelio.bookingservice.service;

import com.hotelio.bookingservice.entity.Booking;
import com.hotelio.bookingservice.repository.BookingRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;

    public BookingService(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    public List<Booking> listAll(String userId) {
        return userId != null ? bookingRepository.findByUserId(userId) : bookingRepository.findAll();
    }
}