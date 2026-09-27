import "reflect-metadata";
import { DataSource } from "typeorm";
import { Booking } from "./entity/Booking";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.PGHOST ?? "localhost",
  port: Number(process.env.PGPORT ?? 5432),
  username: process.env.PGUSER ?? "booking",
  password: process.env.PGPASSWORD ?? "booking",
  database: process.env.PGDATABASE ?? "booking",
  entities: [Booking],
  synchronize: true,
});
