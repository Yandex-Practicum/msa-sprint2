package com.hotelio.booking.kafka

import com.hotelio.booking.model.Booking
import org.slf4j.LoggerFactory
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.kafka.support.SendResult
import org.springframework.stereotype.Component
import java.util.concurrent.CompletableFuture

@Component
class BookingEventProducer(
    private val kafkaTemplate: KafkaTemplate<String, String>
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    companion object {
        const val TOPIC = "booking-events"
    }

    fun sendBookingCreatedEvent(booking: Booking) {
        val event = """
            {
                "eventType": "BookingCreated",
                "bookingId": "${booking.id}",
                "userId": "${booking.userId}",
                "hotelId": "${booking.hotelId}",
                "status": "${booking.status}",
                "price": ${booking.price},
                "promoCode": "${booking.promoCode ?: ""}",
                "createdAt": "${booking.createdAt}"
            }
        """.trimIndent()

        val future: CompletableFuture<SendResult<String, String>> =
            kafkaTemplate.send(TOPIC, booking.id.toString(), event)

        future.whenComplete { result, ex ->
            if (ex != null) {
                logger.error("❌ Ошибка отправки события в Kafka: ${ex.message}", ex)
            } else {
                logger.info("✅ Событие BookingCreated отправлено в Kafka: offset=${result?.recordMetadata?.offset()}")
            }
        }
    }
}