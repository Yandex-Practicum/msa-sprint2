import "reflect-metadata";
import { DataSource } from "typeorm";
import { BookingHistoryRecord } from "./entity/BookingHistoryRecord";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.PGHOST ?? "localhost",
  port: Number(process.env.PGPORT ?? 5432),
  username: process.env.PGUSER ?? "history",
  password: process.env.PGPASSWORD ?? "history",
  database: process.env.PGDATABASE ?? "booking_history",
  entities: [BookingHistoryRecord],
  synchronize: true,
});
