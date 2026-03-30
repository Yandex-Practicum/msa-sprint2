import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import axios from 'axios';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, 'booking.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const bookingPkg = grpc.loadPackageDefinition(packageDef).booking;
const BOOKING_GRPC_ADDR = process.env.BOOKING_GRPC_ADDR || 'booking-service:9090';
const bookingClient = new bookingPkg.BookingService(BOOKING_GRPC_ADDR, grpc.credentials.createInsecure());

const MONOLITH_BASE_URL = process.env.MONOLITH_BASE_URL || 'http://hotelio-monolith:8080';

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.6",
      import: ["@key", "@external", "@requires", "@override"]
    )

  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    discountPercent: Float! @override(from: "booking-subgraph")
    discountInfo: DiscountInfo @requires(fields: "promoCode")
  }

  type DiscountInfo {
    isValid: Boolean!
    originalDiscount: Float!
    finalDiscount: Float!
    description: String
    expiresAt: String
    applicableHotels: [ID!]!
  }

  type Query {
    validatePromoCode(code: String!, hotelId: ID): DiscountInfo!
    activePromoCodes: [DiscountInfo!]!
  }
`;

function listAllBookings() {
  return new Promise((resolve, reject) => {
    bookingClient.ListBookings({ user_id: '' }, (err, resp) => {
      if (err) return reject(err);
      resolve(resp?.bookings || []);
    });
  });
}

async function getOriginalDiscountByBookingId(id) {
  const all = await listAllBookings();
  const b = all.find((x) => String(x.id) === String(id));
  return typeof b?.discount_percent === 'number' ? b.discount_percent : 0;
}

async function validatePromo(code, userId) {
  try {
    const res = await axios.post(`${MONOLITH_BASE_URL}/api/promos/validate`, null, { params: { code, userId } });
    const d = res.data;
    return { isValid: !!d, discount: typeof d?.discount === 'number' ? d.discount : 0, description: d?.description || null, expiresAt: d?.expiresAt || null };
  } catch {
    return { isValid: false, discount: 0, description: null, expiresAt: null };
  }
}

const resolvers = {
  Booking: {
    discountPercent: async (ref, _, { req }) => {
      const original = await getOriginalDiscountByBookingId(ref.id);
      const requester = req?.headers?.['userid'] || null; // optional enrich
      if (ref.promoCode) {
        const v = await validatePromo(ref.promoCode, requester || undefined);
        return v.isValid ? v.discount : original;
      }
      return original;
    },
    discountInfo: async (ref, _, { req }) => {
      const original = await getOriginalDiscountByBookingId(ref.id);
      const requester = req?.headers?.['userid'] || null;
      if (!ref.promoCode) {
        return { isValid: false, originalDiscount: original, finalDiscount: original, description: null, expiresAt: null, applicableHotels: [] };
      }
      const v = await validatePromo(ref.promoCode, requester || undefined);
      return {
        isValid: v.isValid,
        originalDiscount: original,
        finalDiscount: v.isValid ? v.discount : original,
        description: v.description,
        expiresAt: v.expiresAt,
        applicableHotels: [],
      };
    },
  },
  Query: {
    validatePromoCode: async (_, { code, hotelId }) => {
      const v = await validatePromo(code, undefined);
      return { isValid: v.isValid, originalDiscount: 0, finalDiscount: v.discount, description: v.description, expiresAt: v.expiresAt, applicableHotels: hotelId ? [String(hotelId)] : [] };
    },
    activePromoCodes: async () => {
      return [];
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4003 },
  context: async ({ req }) => ({ req }),
}).then(() => {
  console.log('✅ Promocode subgraph ready at http://localhost:4003/');
});
