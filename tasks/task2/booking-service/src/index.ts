import "reflect-metadata";
import { AppDataSource } from "./dataSource";
import { connectProducer } from "./kafkaProducer";
import { startGrpcServer, setReady } from "./grpcServer";
import { startHttpServer } from "./httpServer";

async function main(): Promise<void> {
  startHttpServer();

  await AppDataSource.initialize();
  console.log("booking-service: database connected");

  await connectProducer();
  console.log("booking-service: kafka producer connected");

  startGrpcServer();
  setReady(true);
}

main().catch((err) => {
  console.error("booking-service failed to start:", err);
  process.exit(1);
});
