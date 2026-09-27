import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from "@apollo/gateway";
import type { IncomingHttpHeaders } from "http";

interface GatewayContext {
  headers: IncomingHttpHeaders;
}

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: "booking-subgraph", url: process.env.BOOKING_SUBGRAPH_URL ?? "http://booking-subgraph:4001" },
      { name: "hotel-subgraph", url: process.env.HOTEL_SUBGRAPH_URL ?? "http://hotel-subgraph:4002" },
      { name: "promocode-subgraph", url: process.env.PROMOCODE_SUBGRAPH_URL ?? "http://promocode-subgraph:4003" },
    ],
  }),
  buildService({ url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        const userId = (context as GatewayContext | undefined)?.headers?.userid;
        if (userId) {
          request.http?.headers.set("userid", Array.isArray(userId) ? userId[0] : userId);
        }
      },
    });
  },
});

const server = new ApolloServer<GatewayContext>({ gateway });

startStandaloneServer(server, {
  listen: { port: Number(process.env.PORT ?? 4000) },
  context: async ({ req }) => ({ headers: req.headers }),
}).then(({ url }) => {
  console.log(`🚀 Gateway ready at ${url}`);
});
