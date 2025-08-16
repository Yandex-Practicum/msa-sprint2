import gql from "graphql-tag";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { PROTO_PATH } from "./const";

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

const host = process.env.BOOKING_SERVICE_HOST || "localhost"; // Fallback to localhost if not set
const port = process.env.BOOKING_SERVICE_PORT || "9090"; // Fallback to 9090 if not set

const bookingClient = new (bookingProto as any).BookingService(
  `${host}:${port}`,
  grpc.credentials.createInsecure()
);

const typeDefs = gql`
  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      if (!req.headers["userId"]) {
        throw new Error("User is not Authorized");
      }
      const response = await new Promise((resolve, reject) => {
        bookingClient.ListBookings({ user_id: userId }, (error, response) => {
          if (error) {
            console.error("Error calling ListBookings:", error);
            reject(new Error("Failed to fetch bookings"));
          } else {
            resolve(response);
          }
        });
      });

      return (response as any).bookings;
    },
  },

  Booking: {
    // TODO: Реальный вызов к grpc booking-сервису или заглушка + ACL
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => ({ req }),
}).then(() => {
  console.log("✅ Booking subgraph ready at http://localhost:4001/");
});
