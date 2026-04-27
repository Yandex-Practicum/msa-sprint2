const { Kafka, logLevel } = require("kafkajs");
const { Pool } = require("pg");

const kafkaTopic = process.env.KAFKA_TOPIC || "booking.created";
const kafkaBrokers = (process.env.KAFKA_BROKERS || "kafka:9092").split(",");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://history:history@booking-history-db:5432/booking_history",
});

const kafka = new Kafka({
  clientId: "booking-history-service",
  brokers: kafkaBrokers,
  logLevel: logLevel.WARN,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(name, fn, attempts = 45, delayMs = 2000) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`${name} is not ready (${attempt}/${attempts}): ${error.message}`);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

async function initDb() {
  await retry("booking-history-db", async () => {
    await pool.query("select 1");
  });

  await pool.query(`
    create table if not exists booking_history (
      id bigserial primary key,
      booking_id bigint not null unique,
      user_id text not null,
      hotel_id text not null,
      promo_code text,
      discount_percent double precision not null,
      price double precision not null,
      created_at timestamptz not null,
      received_at timestamptz not null default now(),
      raw_event jsonb not null
    )
  `);

  await pool.query(`
    create table if not exists booking_stats_by_user (
      user_id text primary key,
      booking_count bigint not null default 0,
      total_price double precision not null default 0,
      last_booking_at timestamptz
    )
  `);

  await pool.query(`
    create table if not exists booking_stats_by_hotel (
      hotel_id text primary key,
      booking_count bigint not null default 0,
      total_price double precision not null default 0,
      last_booking_at timestamptz
    )
  `);
}

async function storeEvent(event) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const inserted = await client.query(
      `
        insert into booking_history (
          booking_id, user_id, hotel_id, promo_code, discount_percent, price, created_at, raw_event
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        on conflict (booking_id) do nothing
        returning booking_id
      `,
      [
        Number(event.booking_id),
        event.user_id,
        event.hotel_id,
        event.promo_code || null,
        Number(event.discount_percent || 0),
        Number(event.price || 0),
        event.created_at,
        event,
      ]
    );

    if (inserted.rowCount === 1) {
      await client.query(
        `
          insert into booking_stats_by_user (user_id, booking_count, total_price, last_booking_at)
          values ($1, 1, $2, $3)
          on conflict (user_id) do update set
            booking_count = booking_stats_by_user.booking_count + 1,
            total_price = booking_stats_by_user.total_price + excluded.total_price,
            last_booking_at = greatest(booking_stats_by_user.last_booking_at, excluded.last_booking_at)
        `,
        [event.user_id, Number(event.price || 0), event.created_at]
      );

      await client.query(
        `
          insert into booking_stats_by_hotel (hotel_id, booking_count, total_price, last_booking_at)
          values ($1, 1, $2, $3)
          on conflict (hotel_id) do update set
            booking_count = booking_stats_by_hotel.booking_count + 1,
            total_price = booking_stats_by_hotel.total_price + excluded.total_price,
            last_booking_at = greatest(booking_stats_by_hotel.last_booking_at, excluded.last_booking_at)
        `,
        [event.hotel_id, Number(event.price || 0), event.created_at]
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  await initDb();

  const consumer = kafka.consumer({ groupId: "booking-history-service" });
  await retry("kafka", async () => {
    await consumer.connect();
  });

  await consumer.subscribe({ topic: kafkaTopic, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString("utf8"));
      await storeEvent(event);
      console.log(`Stored BookingCreated event for booking ${event.booking_id}`);
    },
  });

  console.log(`booking-history-service consuming ${kafkaTopic}`);
}

main().catch((error) => {
  console.error("booking-history-service failed:", error);
  process.exit(1);
});
