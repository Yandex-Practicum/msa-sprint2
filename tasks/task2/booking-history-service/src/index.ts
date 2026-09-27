import "reflect-metadata";
import { AppDataSource } from "./dataSource";
import { startConsumer } from "./consumer";

async function main(): Promise<void> {
  await AppDataSource.initialize();
  console.log("booking-history-service: database connected");

  await startConsumer();
  console.log("booking-history-service: kafka consumer started");
}

main().catch((err) => {
  console.error("booking-history-service failed to start:", err);
  process.exit(1);
});
