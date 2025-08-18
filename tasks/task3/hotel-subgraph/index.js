import gql from "graphql-tag";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

export const PROTO_PATH = "./proto/hotel.proto";

export const fetchHotels = async (hotelClient, ids) => {
  const response = await new Promise((resolve, reject) => {
    hotelClient.ListHotels({ ids: ids }, (error, response) => {
      if (error) {
        console.error("Error calling ListHotels:", error);
        reject(new Error("Failed to fetch hotel"));
      } else {
        return resolve(response.hotels);
      }
    });
  });

  return response;
};

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const HotelProto = grpc.loadPackageDefinition(packageDefinition).hotel;

const host = process.env.BOOKING_SERVICE_HOST || "hotel-service";
const port = process.env.BOOKING_SERVICE_PORT || "9091";

const hotelClient = new HotelProto.HotelService(
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

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]
  }
`;

const resolvers = {
  Hotel: {
    __resolveReference: async ({ id }) => {
      const hotels = fetchHotels(hotelClient, [id]);
      return hotels;
    },
  },

  Query: {
    hotelsByIds: async (_, { ids }) => {
      const hotels = fetchHotels(hotelClient, ids);
      return hotels;
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4002 },
}).then(() => {
  console.log("✅ Hotel subgraph ready at http://localhost:4002/");
});
