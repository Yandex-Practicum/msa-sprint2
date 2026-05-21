package com.hotelio.booking.model

import jakarta.persistence.*
import java.time.LocalDateTime
import java.util.concurrent.atomic.AtomicLong

@Entity
@Table(name = "bookings")
data class Booking(
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    val id: Long = idGenerator.incrementAndGet(),

    @Column(name = "user_id", nullable = false)
    val userId: String,

    @Column(name = "hotel_id", nullable = false)
    val hotelId: String,

    @Column(name = "promo_code")
    val promoCode: String? = null,

    @Column(name = "status", nullable = false)
    var status: String = "PENDING",

    @Column(name = "price", nullable = false)
    val price: Double,

    @Column(name = "check_in")
    val checkIn: LocalDateTime = LocalDateTime.now(),

    @Column(name = "created_at", nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
) {
    companion object {
        private val idGenerator = AtomicLong(System.currentTimeMillis())
    }
}