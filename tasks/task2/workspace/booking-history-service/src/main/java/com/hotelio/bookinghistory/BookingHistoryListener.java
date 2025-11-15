package com.hotelio.bookinghistory;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class BookingHistoryListener {

    private final BookingStatRepository repo;
    private final ObjectMapper mapper = new ObjectMapper();

    public BookingHistoryListener(BookingStatRepository repo) {
        this.repo = repo;
    }

    @KafkaListener(topics = "${kafka.topic}", groupId = "booking-history")
    public void onMessage(String payload) throws Exception {
        var node = mapper.readTree(payload);
        String userId = node.get("userId").asText();
        var stat = repo.findById(userId).orElseGet(() -> {
            var s = new BookingStat();
            s.setUserId(userId);
            s.setTotalBookings(0);
            return s;
        });
        stat.setTotalBookings(stat.getTotalBookings() + 1);
        repo.save(stat);
        System.out.println("history updated for user " + userId);
    }
}
