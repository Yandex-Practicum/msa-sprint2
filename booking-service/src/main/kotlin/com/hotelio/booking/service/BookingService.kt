package com.hotelio.booking.service

import com.hotelio.booking.model.Booking
import com.hotelio.booking.repository.BookingRepository
import com.hotelio.booking.kafka.BookingEventProducer
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestTemplate

@Service
class BookingService(
    private val bookingRepository: BookingRepository,
    private val eventProducer: BookingEventProducer
) {
    private val restTemplate = RestTemplate()
    private val monolithBaseUrl = "http://hotelio-monolith:8080"

    @Transactional
    fun createBooking(userId: String, hotelId: String, promoCode: String?): Booking {
        // Проверка пользователя
        checkUser(userId)

        // Проверка отеля
        checkHotel(hotelId)

        // Проверка промокода
        if (promoCode != null) {
            checkPromo(promoCode, userId)
        }

        val price = calculatePrice(hotelId, promoCode)

        val booking = Booking(
            userId = userId,
            hotelId = hotelId,
            promoCode = promoCode,
            price = price
        )

        val saved = bookingRepository.save(booking)
        eventProducer.sendBookingCreatedEvent(saved)
        return saved
    }

    private fun checkUser(userId: String) {
        try {
            val authorized = restTemplate.getForObject(
                "$monolithBaseUrl/api/users/$userId/authorized", Boolean::class.java
            )
            if (authorized != true) {
                throw IllegalStateException("Пользователь $userId не авторизован")
            }
        } catch (e: Exception) {
            if (e is IllegalStateException) throw e
            throw IllegalStateException("Ошибка проверки пользователя $userId: ${e.message}")
        }
    }

    private fun checkHotel(hotelId: String) {
        try {
            val trusted = restTemplate.getForObject(
                "$monolithBaseUrl/api/reviews/hotel/$hotelId/trusted", Boolean::class.java
            )
            if (trusted != true) {
                throw IllegalStateException("Отель $hotelId не является надёжным")
            }

            val fullyBooked = restTemplate.getForObject(
                "$monolithBaseUrl/api/hotels/$hotelId/fully-booked", Boolean::class.java
            )
            if (fullyBooked == true) {
                throw IllegalStateException("Отель $hotelId полностью забронирован")
            }
        } catch (e: Exception) {
            if (e is IllegalStateException) throw e
            throw IllegalStateException("Ошибка проверки отеля $hotelId: ${e.message}")
        }
    }

    private fun checkPromo(promoCode: String, userId: String) {
        try {
            val valid = restTemplate.getForObject(
                "$monolithBaseUrl/api/promos/$promoCode/valid", Boolean::class.java
            )
            if (valid != true) {
                throw IllegalStateException("Промокод $promoCode недействителен")
            }
        } catch (e: Exception) {
            if (e is IllegalStateException) throw e
            throw IllegalStateException("Ошибка проверки промокода $promoCode: ${e.message}")
        }
    }

    fun getAllBookings(): List<Booking> = bookingRepository.findAll()

    fun getUserBookings(userId: String): List<Booking> {
        return bookingRepository.findAll().filter { it.userId == userId }
    }

    private fun calculatePrice(hotelId: String, promoCode: String?): Double {
        val basePrice = 100.0
        val discount = if (promoCode != null) 10.0 else 0.0
        return basePrice - discount
    }
}