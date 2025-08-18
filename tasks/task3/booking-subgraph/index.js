import gql from "graphql-tag";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { RESTDataSource } from "@apollo/datasource-rest";
import { buildSubgraphSchema } from "@apollo/subgraph";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

export const PROTO_PATH = "./proto/booking.proto";

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const BookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

const HOST = process.env.BOOKING_SERVICE_HOST || "booking-service";
const PORT = process.env.BOOKING_SERVICE_PORT || "9090";
const HOTEL_SUBGRAPH_HOST = process.env.HOTEL_SUBGRAPH_URL || "hotel-subgraph";
const HOTEL_SUBGRAPH_PORT = process.env.HOTEL_SUBGRAPH_PORT || "4002";

const bookingClient = new BookingProto.BookingService(
  `${HOST}:${PORT}`,
  grpc.credentials.createInsecure()
);

class HotelAPI extends RESTDataSource {
  baseURL = `http://${HOTEL_SUBGRAPH_HOST}:${HOTEL_SUBGRAPH_PORT}/`;
  async getHotelById(id) {
    try {
      const response = await this.post("", {
        body: {
          query: `
            query GetHotel($id: ID!) {
              hotelsByIds(ids: [$id]) {
                id
                name
                city
                stars
              }
            }
          `,
          variables: {
            id: id,
          },
        },
      });
      console.log(response);

      // Your hotel subgraph returns an array - take the first item
      return response.data?.hotelsByIds?.[0] || null;
    } catch (error) {
      console.error(
        "Hotel API Error:",
        error.extensions?.response?.body || error.message
      );
      throw new Error("Failed to fetch hotel details");
    }
  }
}

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
      if (!req.headers["userId"] || !userId) {
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

      return response.bookings;
    },
  },

  Booking: {
    hotel: async (booking, _, { dataSources }) => {
      if (!booking.hotelId) {
        return null;
      }

      const res = dataSources.hotelAPI.getHotelById(booking.hotelId);

      console.log(res);

      return res;
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  dataSources: () => ({
    hotelAPI: new HotelAPI(),
  }),
});

startStandaloneServer(server, {
  listen: { port: 4001 },
  context: async ({ req }) => {
    return {
      req,
      dataSources: {
        hotelAPI: new HotelAPI(), // Ensure dataSources are available in context
      },
    };
  },
}).then(() => {
  console.log("✅ Booking subgraph ready at http://localhost:4001/");
});
