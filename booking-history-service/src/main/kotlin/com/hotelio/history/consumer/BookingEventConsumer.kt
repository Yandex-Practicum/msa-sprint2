package com.hotelio.history.consumer

import com.hotelio.history.service.BookingStatisticsService
import org.slf4j.LoggerFactory
import org.springframework.kafka.annotation.KafkaListener
import org.springframework.stereotype.Component

@Component
class BookingEventConsumer(
    private val statisticsService: BookingStatisticsService
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @KafkaListener(
        topics = ["booking-events"],
        groupId = "booking-history-group"
    )
    fun consume(message: String) {
        logger.info("📨 Получено событие из Kafka: $message")

        try {
            statisticsService.processEvent(message)
            logger.info("✅ Событие обработано успешно")
        } catch (e: Exception) {
            logger.error("❌ Ошибка обработки события: ${e.message}", e)
        }
    }
}