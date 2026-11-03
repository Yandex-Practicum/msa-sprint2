package com.hotelio.history.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "booking_history")
@Getter
@Setter
@NoArgsConstructor
public class BookingHistory {

    @Id
    private String bookingId;

    private String eventId;

    private String userId;

    private String hotelId;

    private Instant createdAt;

    private Double basePrice;

    private Double discount;

    private Double price;

    private String promoCode;

    private String userStatus;

    private String hotelCity;

    private Instant receivedAt;

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof BookingHistory history)) {
            return false;
        }

        return bookingId != null && bookingId.equals(history.bookingId);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
