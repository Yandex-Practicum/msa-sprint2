const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { Kafka, logLevel } = require("kafkajs");
const path = require("path");
const { Pool } = require("pg");

const protoPath = path.join(__dirname, "..", "booking.proto");
const grpcPort = Number(process.env.GRPC_PORT || 9090);
const monolithUrl = process.env.MONOLITH_URL || "http://monolith:8080";
const kafkaTopic = process.env.KAFKA_TOPIC || "booking.created";
const kafkaBrokers = (process.env.KAFKA_BROKERS || "kafka:9092").split(",");

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://booking:booking@booking-db:5432/booking",
});

const kafka = new Kafka({
  clientId: "booking-service",
  brokers: kafkaBrokers,
  logLevel: logLevel.WARN,
});
const producer = kafka.producer();

let producerReady = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(name, fn, attempts = 30, delayMs = 2000) {
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
  await retry("booking-db", async () => {
    await pool.query("select 1");
  });

  await pool.query(`
    create table if not exists bookings (
      id bigserial primary key,
      user_id text not null,
      hotel_id text not null,
      promo_code text,
      discount_percent double precision not null default 0,
      price double precision not null,
      created_at timestamptz not null default now()
    )
  `);
}

async function initKafka() {
  await retry("kafka", async () => {
    await producer.connect();
    producerReady = true;
  }, 45, 2000);
}

async function fetchText(urlPath, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${monolithUrl}${urlPath}`, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${urlPath}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseBoolean(value) {
  return String(value).trim().toLowerCase() === "true";
}

function requireNonBlank(value, fieldName) {
  if (!value || String(value).trim() === "") {
    const error = new Error(`${fieldName} is required`);
    error.grpcCode = grpc.status.INVALID_ARGUMENT;
    throw error;
  }
}

async function validateUser(userId) {
  const safeUserId = encodeURIComponent(userId);
  const active = parseBoolean(await fetchText(`/api/users/${safeUserId}/active`));
  if (!active) {
    throw new Error("User is inactive");
  }

  const blacklisted = parseBoolean(await fetchText(`/api/users/${safeUserId}/blacklisted`));
  if (blacklisted) {
    throw new Error("User is blacklisted");
  }

  return (await fetchText(`/api/users/${safeUserId}/status`)).trim();
}

async function validateHotel(hotelId) {
  const safeHotelId = encodeURIComponent(hotelId);
  const operational = parseBoolean(await fetchText(`/api/hotels/${safeHotelId}/operational`));
  if (!operational) {
    throw new Error("Hotel is not operational");
  }

  const trusted = parseBoolean(await fetchText(`/api/reviews/hotel/${safeHotelId}/trusted`));
  if (!trusted) {
    throw new Error("Hotel is not trusted based on reviews");
  }

  const fullyBooked = parseBoolean(await fetchText(`/api/hotels/${safeHotelId}/fully-booked`));
  if (fullyBooked) {
    throw new Error("Hotel is fully booked");
  }
}

async function resolvePromoDiscount(promoCode, userId) {
  if (!promoCode || promoCode.trim() === "") {
    return 0;
  }

  try {
    const body = await fetchText(
      `/api/promos/validate?code=${encodeURIComponent(promoCode)}&userId=${encodeURIComponent(userId)}`,
      { method: "POST" }
    );
    const promo = JSON.parse(body);
    return Number(promo.discount || 0);
  } catch (error) {
    console.log(`Promo code ${promoCode} is not applicable for user ${userId}: ${error.message}`);
    return 0;
  }
}

function toBookingResponse(row) {
  return {
    id: String(row.id),
    user_id: row.user_id,
    hotel_id: row.hotel_id,
    promo_code: row.promo_code || "",
    discount_percent: Number(row.discount_percent || 0),
    price: Number(row.price),
    created_at: new Date(row.created_at).toISOString(),
  };
}

async function publishBookingCreated(row) {
  if (!producerReady) {
    throw new Error("Kafka producer is not ready");
  }

  const event = {
    event_type: "BookingCreated",
    event_id: `${row.id}-${new Date(row.created_at).toISOString()}`,
    booking_id: String(row.id),
    user_id: row.user_id,
    hotel_id: row.hotel_id,
    promo_code: row.promo_code || "",
    discount_percent: Number(row.discount_percent || 0),
    price: Number(row.price),
    created_at: new Date(row.created_at).toISOString(),
    emitted_at: new Date().toISOString(),
  };

  await producer.send({
    topic: kafkaTopic,
    messages: [{ key: String(row.id), value: JSON.stringify(event) }],
  });
}

async function createBooking(call, callback) {
  try {
    const request = call.request;
    const userId = request.user_id;
    const hotelId = request.hotel_id;
    const promoCode = request.promo_code || null;

    requireNonBlank(userId, "user_id");
    requireNonBlank(hotelId, "hotel_id");

    console.log(`Creating booking: userId=${userId}, hotelId=${hotelId}, promoCode=${promoCode || ""}`);

    const userStatus = await validateUser(userId);
    await validateHotel(hotelId);

    const basePrice = userStatus.toUpperCase() === "VIP" ? 80 : 100;
    const discount = await resolvePromoDiscount(promoCode, userId);
    const finalPrice = basePrice - discount;

    const result = await pool.query(
      `
        insert into bookings (user_id, hotel_id, promo_code, discount_percent, price, created_at)
        values ($1, $2, $3, $4, $5, now())
        returning id, user_id, hotel_id, promo_code, discount_percent, price, created_at
      `,
      [userId, hotelId, promoCode, discount, finalPrice]
    );

    const booking = result.rows[0];
    await publishBookingCreated(booking);

    callback(null, toBookingResponse(booking));
  } catch (error) {
    console.error("CreateBooking failed:", error);
    callback({
      code: error.grpcCode || grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

async function listBookings(call, callback) {
  try {
    const userId = call.request.user_id || "";
    const query = userId.trim()
      ? {
          text: `
            select id, user_id, hotel_id, promo_code, discount_percent, price, created_at
            from bookings
            where user_id = $1
            order by id
          `,
          values: [userId],
        }
      : {
          text: `
            select id, user_id, hotel_id, promo_code, discount_percent, price, created_at
            from bookings
            order by id
          `,
          values: [],
        };

    const result = await pool.query(query);
    callback(null, { bookings: result.rows.map(toBookingResponse) });
  } catch (error) {
    console.error("ListBookings failed:", error);
    callback({
      code: grpc.status.INTERNAL,
      message: error.message,
    });
  }
}

function loadService() {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  return grpc.loadPackageDefinition(packageDefinition).booking;
}

async function main() {
  await initDb();
  await initKafka();

  const bookingProto = loadService();
  const server = new grpc.Server();
  server.addService(bookingProto.BookingService.service, {
    CreateBooking: createBooking,
    ListBookings: listBookings,
  });

  server.bindAsync(`0.0.0.0:${grpcPort}`, grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    server.start();
    console.log(`booking-service gRPC listening on ${port}`);
  });
}

main().catch((error) => {
  console.error("booking-service failed to start:", error);
  process.exit(1);
});
