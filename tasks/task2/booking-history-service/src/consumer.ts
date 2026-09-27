import { Kafka } from "kafkajs";
import { AppDataSource } from "./dataSource";
import { BookingHistoryRecord } from "./entity/BookingHistoryRecord";

interface BookingCreatedEvent {
  eventType: string;
  id: string;
  userId: string;
  hotelId: string;
  promoCode: string | null;
  discountPercent: number;
  price: number;
  createdAt: string;
}

const kafka = new Kafka({
  clientId: "booking-history-service",
  brokers: (process.env.KAFKA_BROKERS ?? "localhost:9092").split(","),
});

const topic = process.env.KAFKA_TOPIC ?? "booking-events";
const groupId = process.env.KAFKA_GROUP_ID ?? "booking-history-service";

export async function startConsumer(): Promise<void> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  const repo = AppDataSource.getRepository(BookingHistoryRecord);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) {
        return;
      }

      const event: BookingCreatedEvent = JSON.parse(message.value.toString());
      if (event.eventType !== "BookingCreated") {
        return;
      }

      const record = repo.create({
        bookingId: event.id,
        userId: event.userId,
        hotelId: event.hotelId,
        promoCode: event.promoCode,
        discountPercent: event.discountPercent,
        price: event.price,
        bookingCreatedAt: new Date(event.createdAt),
      });

      await repo.save(record);
      console.log(`booking-history-service: stored history record for booking ${event.id}`);
    },
  });
}
