import gql from "graphql-tag";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

export const PROTO_PATH = "./proto/booking.proto";

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const BookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

const host = process.env.BOOKING_SERVICE_HOST || "booking-service";
const port = process.env.BOOKING_SERVICE_PORT || "9090";

const bookingClient = new BookingProto.BookingService(
  `${host}:${port}`,
  grpc.credentials.createInsecure()
);

const typeDefs = gql`
  type Hotel @key(fields: "id") {
    id: ID!
    name: String
    city: String
    stars: Int
  }

  type Booking @key(fields: "id") {
    id: ID!
    userId: String!
    hotelId: String!
    promoCode: String
    discountPercent: Int
    hotel: Hotel @provides(fields: "id")
  }

  type Query {
    bookingsByUser(userId: String!): [Booking]
  }
`;

const resolvers = {
  Query: {
    bookingsByUser: async (_, { userId }, { req }) => {
      if (!req.headers["userId"] && !userId) {
        throw new Error("User is not Authorized");
      }

      const response = await new Promise((resolve, reject) => {
        const bookingRequestData = { userId: userId };

        bookingClient.ListBookings(bookingRequestData, (error, response) => {
          if (error) {
            console.error("Error calling ListBookings:", error);
            reject(new Error("Failed to fetch bookings"));
          } else {
            return resolve(response);
          }
        });
      });

      console.log(response);

      return response.bookings;
    },
  },

  Booking: {
    // // TODO: Реальный вызов к grpc booking-сервису или заглушка + ACL
    hotel: async (booking) => {
      return {
        __typename: "Hotel",
        id: booking.hotelId,
      };
    },
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
