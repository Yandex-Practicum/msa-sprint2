import { Kafka, Producer } from "kafkajs";
import { Booking } from "./entity/Booking";

const kafka = new Kafka({
  clientId: "booking-service",
  brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
});

const producer: Producer = kafka.producer();

export async function connectProducer(): Promise<void> {
  await producer.connect();
}

export async function disconnectProducer(): Promise<void> {
  await producer.disconnect();
}

export async function publishBookingCreated(booking: Booking): Promise<void> {
  const event = {
    eventType: "BookingCreated",
    id: String(booking.id),
    userId: booking.userId,
    hotelId: booking.hotelId,
    promoCode: booking.promoCode,
    discountPercent: booking.discountPercent,
    price: booking.price,
    createdAt: booking.createdAt.toISOString(),
  };

  await producer.send({
    topic: process.env.KAFKA_TOPIC ?? "booking-events",
    messages: [{ key: String(booking.id), value: JSON.stringify(event) }],
  });
}
