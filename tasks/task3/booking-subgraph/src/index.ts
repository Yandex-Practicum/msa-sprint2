import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";
import { IncomingHttpHeaders } from "http";
import { createBookingLoader, Booking } from "./bookingLoader";

interface Ctx {
  headers: IncomingHttpHeaders;
  bookingLoader: ReturnType<typeof createBookingLoader>;
}

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: ID!
    hotelId: ID!
    hotel: Hotel
    promoCode: String
    discountPercent: Float
  }

  extend type Hotel @key(fields: "id") {
    id: ID! @external
  }

  type Query {
    userBookings(userId: ID!): [Booking!]!
    booking(id: ID!): Booking
  }
`;

function currentUserId(ctx: Ctx): string | undefined {
  const raw = ctx.headers["userid"];
  return Array.isArray(raw) ? raw[0] : raw;
}

// ACL: пользователь видит только свои бронирования. booking-service отдаёт брони
// только по userId, так что "список своих броней" и есть источник правды для
// booking(id) и __resolveReference — искать в чужом списке нечего.
async function ownBookings(ctx: Ctx): Promise<Booking[]> {
  const userId = currentUserId(ctx);
  if (!userId) return [];
  return ctx.bookingLoader.load(userId);
}

const resolvers = {
  Query: {
    userBookings: async (_: unknown, { userId }: { userId: string }, ctx: Ctx) => {
      const authUserId = currentUserId(ctx);
      if (authUserId !== userId) {
        // заголовок userid не совпадает с запрошенным userId — не авторизован, ничего не отдаём
        console.log(`[booking-subgraph] ACL DENY: userBookings(userId="${userId}"), заголовок userid="${authUserId ?? ""}"`);
        return [];
      }
      console.log(`[booking-subgraph] ACL OK: userBookings(userId="${userId}") -> gRPC ListBookings`);
      return ctx.bookingLoader.load(userId);
    },
    booking: async (_: unknown, { id }: { id: string }, ctx: Ctx) => {
      const own = await ownBookings(ctx);
      return own.find((b) => b.id === id) ?? null;
    },
  },
  Booking: {
    __resolveReference: async (reference: { id: string }, ctx: Ctx) => {
      const own = await ownBookings(ctx);
      return own.find((b) => b.id === reference.id) ?? null;
    },
    // отдаём ссылку на сущность Hotel — сам отель резолвит hotel-subgraph через __resolveReference
    hotel: (parent: Booking) => ({ __typename: "Hotel", id: parent.hotelId }),
  },
};

const server = new ApolloServer<Ctx>({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: Number(process.env.PORT ?? 4001) },
  context: async ({ req }) => ({
    headers: req.headers,
    bookingLoader: createBookingLoader(),
  }),
}).then(() => {
  console.log("✅ Booking subgraph ready at http://localhost:4001/");
});
