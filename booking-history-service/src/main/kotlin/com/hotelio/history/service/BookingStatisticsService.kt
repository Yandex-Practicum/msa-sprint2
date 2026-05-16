package com.hotelio.history.service

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

@Service
class BookingStatisticsService {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val objectMapper = ObjectMapper()

    // Счётчики статистики
    private val totalBookings = AtomicInteger(0)
    private val bookingsByUser = ConcurrentHashMap<String, AtomicInteger>()
    private val bookingsByHotel = ConcurrentHashMap<String, AtomicInteger>()
    private val totalRevenue = AtomicInteger(0)

    fun processEvent(eventJson: String) {
        val event = objectMapper.readTree(eventJson)
        val eventType = event.get("eventType").asText()

        if (eventType == "BookingCreated") {
            val bookingId = event.get("bookingId").asText()
            val userId = event.get("userId").asText()
            val hotelId = event.get("hotelId").asText()
            val price = event.get("price").asInt()
            val createdAt = event.get("createdAt").asText()

            // Обновляем статистику
            val count = totalBookings.incrementAndGet()
            bookingsByUser.computeIfAbsent(userId) { AtomicInteger(0) }.incrementAndGet()
            bookingsByHotel.computeIfAbsent(hotelId) { AtomicInteger(0) }.incrementAndGet()
            totalRevenue.addAndGet(price)

            // Выводим статистику в логи (в реальном проекте — в БД)
            logger.info("""
                📊 Статистика бронирований обновлена:
                   - Всего бронирований: $count
                   - Пользователь $userId: ${bookingsByUser[userId]} бронирований
                   - Отель $hotelId: ${bookingsByHotel[hotelId]} бронирований
                   - Общая выручка: ${totalRevenue.get()} ₽
                   - Последнее бронирование: $bookingId в $createdAt
            """.trimIndent())
        }
    }

    fun getStatistics(): Map<String, Any> {
        return mapOf(
            "totalBookings" to totalBookings.get(),
            "bookingsByUser" to bookingsByUser.mapValues { it.value.get() },
            "bookingsByHotel" to bookingsByHotel.mapValues { it.value.get() },
            "totalRevenue" to totalRevenue.get()
        )
    }
}