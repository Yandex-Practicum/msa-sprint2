import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import DataLoader from 'dataloader';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.3"
      import: ["@key", "@external", "@override", "@requires"]
    )

  type DiscountInfo {
    isValid: Boolean!
    originalDiscount: Float!
    finalDiscount: Float!
    description: String
    expiresAt: String
    applicableHotels: [ID!]!
  }

  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    discountPercent: Float! @override(from: "booking")
    discountInfo: DiscountInfo @requires(fields: "promoCode")
  }

  type Query {
    validatePromoCode(code: String!, hotelId: ID): DiscountInfo!
    activePromoCodes: [DiscountInfo!]!
  }
`;

/** Known promos: final discount % when valid */
const PROMO_CATALOG = {
  SUMMER: {
    finalPercent: 25,
    description: 'Summer campaign',
    expiresAt: '2026-12-31',
    applicableHotels: [],
  },
  WINTER: {
    finalPercent: 15,
    description: 'Winter sale',
    expiresAt: '2026-03-31',
    applicableHotels: [],
  },
};

function promoAppliesToHotel(rule, hotelId) {
  if (!rule.applicableHotels?.length) return true;
  if (!hotelId) return true;
  return rule.applicableHotels.includes(String(hotelId));
}

function buildDiscountInfoFromBookingRow(row, hotelId) {
  const original = row ? Number(row.discount_percent) || 0 : 0;
  const code = (row?.promo_code || '').trim();
  const rule = code ? PROMO_CATALOG[code] : null;
  const valid = !!(rule && promoAppliesToHotel(rule, hotelId));
  const finalDiscount = valid ? rule.finalPercent : original;
  return {
    isValid: valid,
    originalDiscount: original,
    finalDiscount,
    description: rule?.description ?? null,
    expiresAt: rule?.expiresAt ?? null,
    applicableHotels: rule?.applicableHotels?.length ? [...rule.applicableHotels] : [],
  };
}

function validateCodeOnly(code, hotelId) {
  const rule = PROMO_CATALOG[(code || '').trim()];
  const valid = !!(rule && promoAppliesToHotel(rule, hotelId));
  return {
    isValid: valid,
    originalDiscount: 0,
    finalDiscount: valid ? rule.finalPercent : 0,
    description: rule?.description ?? null,
    expiresAt: rule?.expiresAt ?? null,
    applicableHotels: rule?.applicableHotels?.length ? [...rule.applicableHotels] : [],
  };
}

function loadGrpcClient() {
  const target = process.env.BOOKING_GRPC_URL;
  if (!target) return null;
  const def = protoLoader.loadSync(join(__dirname, 'booking.proto'), {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const booking = grpc.loadPackageDefinition(def).booking;
  return new booking.BookingService(target, grpc.credentials.createInsecure());
}

const grpcClient = loadGrpcClient();

async function fetchAllBookingsMap() {
  if (!grpcClient) {
    const mock = new Map();
    mock.set('b1', {
      id: 'b1',
      user_id: 'user1',
      hotel_id: 'h1',
      promo_code: 'SUMMER',
      discount_percent: 10,
    });
    return mock;
  }
  return new Promise((resolve, reject) => {
    grpcClient.listBookings({ user_id: '' }, (err, res) => {
      if (err) {
        reject(err);
        return;
      }
      const map = new Map();
      for (const b of res.bookings || []) {
        map.set(String(b.id), b);
      }
      resolve(map);
    });
  });
}

function createBookingRowLoader() {
  let cacheMap = null;
  return new DataLoader(async (ids) => {
    if (!cacheMap) {
      try {
        cacheMap = await fetchAllBookingsMap();
      } catch (e) {
        console.error('promocode booking batch load error', e.message);
        cacheMap = new Map();
      }
    }
    return ids.map((id) => cacheMap.get(String(id)) ?? null);
  });
}

const resolvers = {
  Query: {
    validatePromoCode: (_, { code, hotelId }) => validateCodeOnly(code, hotelId),
    activePromoCodes: () =>
      Object.entries(PROMO_CATALOG).map(([code, rule]) => ({
        isValid: true,
        originalDiscount: 0,
        finalDiscount: rule.finalPercent,
        description: `${rule.description} (${code})`,
        expiresAt: rule.expiresAt,
        applicableHotels: rule.applicableHotels || [],
      })),
  },
  Booking: {
    discountPercent: async (parent, _, { bookingRowLoader }) => {
      const row = await bookingRowLoader.load(String(parent.id));
      if (!row) return 0;
      const hotelId = row.hotel_id;
      const info = buildDiscountInfoFromBookingRow(row, hotelId);
      return info.finalDiscount;
    },
    discountInfo: async (parent, _, { bookingRowLoader }) => {
      const row = await bookingRowLoader.load(String(parent.id));
      const hotelId = row?.hotel_id;
      if (!(parent.promoCode || '').trim()) {
        return {
          isValid: false,
          originalDiscount: row ? Number(row.discount_percent) || 0 : 0,
          finalDiscount: row ? Number(row.discount_percent) || 0 : 0,
          description: null,
          expiresAt: null,
          applicableHotels: [],
        };
      }
      if (!row) {
        return {
          isValid: false,
          originalDiscount: 0,
          finalDiscount: 0,
          description: null,
          expiresAt: null,
          applicableHotels: [],
        };
      }
      return buildDiscountInfoFromBookingRow(row, hotelId);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4003 },
  context: async () => ({
    bookingRowLoader: createBookingRowLoader(),
  }),
}).then(() => {
  console.log('✅ Promocode subgraph ready at http://localhost:4003/');
});
