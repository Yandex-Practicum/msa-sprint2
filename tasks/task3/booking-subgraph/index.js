import { ApolloServer, gql } from 'apollo-server';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { GraphQLError } from 'graphql';
import { request } from 'undici';
import fs from 'fs';

let grpcClient = null;
const USE_GRPC =
  process.env.GRPC_HOST &&
  process.env.GRPC_PORT &&
  process.env.GRPC_PROTO_PATH &&
  fs.existsSync(process.env.GRPC_PROTO_PATH);

if (USE_GRPC) {
  try {
    const grpc = await import('@grpc/grpc-js');
    const protoLoader = await import('@grpc/proto-loader');
    const packageDef = protoLoader.loadSync(process.env.GRPC_PROTO_PATH, {
      enums: String,
      longs: String,
      defaults: true,
      oneofs: true,
      includeDirs: [process.cwd()],
    });
    const grpcPkg = grpc.loadPackageDefinition(packageDef)[
      process.env.GRPC_PKG || 'booking'
    ];
    const svcCtor = grpcPkg[process.env.GRPC_SERVICE || 'BookingService'];
    grpcClient = new svcCtor(
      `${process.env.GRPC_HOST}:${process.env.GRPC_PORT}`,
      grpc.credentials.createInsecure(),
      { 'grpc.keepalive_time_ms': 10_000 }
    );
    console.info(
      `[booking-subgraph] gRPC client READY → ${process.env.GRPC_HOST}:${process.env.GRPC_PORT}`
    );
  } catch (e) {
    console.warn(
      `[booking-subgraph] gRPC init failed, will fallback to REST: ${e?.message}`
    );
    grpcClient = null;
  }
}

const REST_BASE =
  process.env.BOOKING_API_BASE || 'http://monolith:8080';

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
    hotel: Hotel
  }

  type Hotel @key(fields: "id") {
    id: ID!
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

async function fetchBookingsRest(userId, signal) {
  const url = `${REST_BASE.replace(/\/$/, '')}/api/bookings?userId=${encodeURIComponent(
    userId
  )}`;
  const { body } = await request(url, { method: 'GET', bodyTimeout: 3_000, headersTimeout: 3_000, signal });
  const json = await body.json();
  return Array.isArray(json) ? json.map(trimBooking) : [];
}

function trimBooking(b) {
  return {
    id: String(b.id),
    userId: String(b.userId),
    hotelId: String(b.hotelId),
    promoCode: b.promoCode ?? null,
    discountPercent: typeof b.discountPercent === 'number' ? b.discountPercent : null,
  };
}

function withTimeout(ms) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return { signal: ac.signal, cancel: () => clearTimeout(t) };
}

async function fetchBookingsGrpc(userId) {
  const call = (method, payload) =>
    new Promise((resolve, reject) => {
      grpcClient[method](payload, (err, resp) => (err ? reject(err) : resolve(resp)));
    });

  if (typeof grpcClient?.ListBookingsByUser === 'function') {
    const r = await call('ListBookingsByUser', { userId });
    return (r?.bookings || []).map(trimBooking);
  }

  if (typeof grpcClient?.GetUserBookings === 'function') {
    const r = await call('GetUserBookings', { userId });
    return (r?.items || []).map(trimBooking);
  }

  throw new Error('Unsupported gRPC methods on BookingService');
}

const bookingStore = {
  async getByUser(userId) {
    const started = Date.now();
    try {
      if (grpcClient) {
        const list = await fetchBookingsGrpc(userId);
        console.info(
          `[booking-subgraph] source=grpc user=${userId} count=${list.length} durMs=${Date.now() - started}`
        );
        return list;
      }
      const t = withTimeout(3000);
      try {
        const list = await fetchBookingsRest(userId, t.signal);
        console.info(
          `[booking-subgraph] source=rest user=${userId} count=${list.length} durMs=${Date.now() - started}`
        );
        return list;
      } finally {
        t.cancel();
      }
    } catch (e) {
      console.error(
        `[booking-subgraph] fetch error user=${userId} msg=${e?.message}`
      );
      return [];
    }
  },
};

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      const caller = req.headers['userid'];
      if (!caller || caller !== userId) {
        throw new GraphQLError('Forbidden', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return bookingStore.getByUser(userId);
    },
  },
  Booking: {
    hotel: (b) => ({ __typename: 'Hotel', id: b.hotelId }),
    promoCode: (b, _, { req }) => (req.headers['userid'] === b.userId ? b.promoCode : null),
    discountPercent: (b, _, { req }) =>
      req.headers['userid'] === b.userId ? b.discountPercent : null,
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  context: ({ req }) => ({ req }),
  csrfPrevention: true,
  cache: 'bounded',
  introspection: true,
  plugins: [
    {
      async requestDidStart() {
        const started = Date.now();
        return {
          willSendResponse(ctx) {
            const qn = ctx?.request?.operationName || 'anonymous';
            console.info(
              `[booking-subgraph] op=${qn} durMs=${Date.now() - started}`
            );
          },
        };
      },
    },
  ],
});

const PORT = process.env.PORT || 4001;
server.listen({ port: PORT }).then(({ url }) => {
  console.log(`[booking-subgraph] up at ${url}`);
});
