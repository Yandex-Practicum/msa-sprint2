import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";
import { createHotelLoader } from "./hotelLoader";

interface Ctx {
  hotelLoader: ReturnType<typeof createHotelLoader>;
}

const typeDefs = gql`
  type Hotel @key(fields: "id") {
    id: ID!
    name: String
    city: String
    rating: Float
    description: String
    operational: Boolean
    fullyBooked: Boolean
  }

  type Query {
    hotelsByIds(ids: [ID!]!): [Hotel]!
  }
`;

const resolvers = {
  Hotel: {
    __resolveReference: async (reference: { id: string }, ctx: Ctx) => {
      return ctx.hotelLoader.load(reference.id);
    },
  },
  Query: {
    hotelsByIds: async (_: unknown, { ids }: { ids: string[] }, ctx: Ctx) => {
      const results = await ctx.hotelLoader.loadMany(ids);
      return results.map((r) => (r instanceof Error ? null : r));
    },
  },
};

const server = new ApolloServer<Ctx>({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: Number(process.env.PORT ?? 4002) },
  context: async () => ({ hotelLoader: createHotelLoader() }),
}).then(() => {
  console.log("✅ Hotel subgraph ready at http://localhost:4002/");
});
