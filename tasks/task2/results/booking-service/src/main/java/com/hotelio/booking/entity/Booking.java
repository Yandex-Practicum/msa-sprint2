package com.hotelio.booking.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "booking")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userId;

    private String hotelId;

    private String promoCode;

    // Абсолютная скидка: название поля сохранено из монолита ради совместимости контракта.
    private Double discountPercent;

    private Double price;

    private Instant createdAt;

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof Booking booking)) {
            return false;
        }

        return id != null && id.equals(booking.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
