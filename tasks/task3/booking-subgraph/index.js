import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';
import { GraphQLError } from 'graphql/error/index.js';
import { BookingClient } from './booking-grcp.js';

const typeDefs = gql`
    type Booking @key(fields: "id") {
        id: ID!
        userId: String!
        hotelId: String!
        hotel: Hotel!
        promoCode: String
        discountPercent: Int
    }

    extend type Hotel @key(fields: "id") {
        id: ID! @external
    }


    type Query {
        bookingsByUser(userId: String!): [Booking]
    }
`;
const bookingClient = new BookingClient();

const resolvers = {
	Query: {
		bookingsByUser: async (_, { userId }, { req }) => {
			const userIdHeader = req.headers['userid'];
			if (userIdHeader === userId) {
				console.log("userId header is matched, access granted!")
				const bookingsResponse = await bookingClient.listBookings(userId);
				console.log("Received bookings from booking-service through gRPC...")
				return bookingsResponse.bookings.map(({ id, user_id, hotel_id, promo_code, discount_percent }) =>
					({
						id,
						userId: user_id,
						hotelId: hotel_id,
						promoCode: promo_code,
						discountPercent: discount_percent,
					}),
				);
			} else {
				console.log("userId header is NOT matched, returning FORBIDDEN status!")
				throw new GraphQLError('User have no access to booking or booking dont exists', {
					extensions: {
						http: { status: 403 },
					},
				});
			}
		},
	},
	Booking: {
		hotel(booking) {
			return { __typename: 'Hotel', id: booking.hotelId };
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
	console.log('✅ Booking subgraph ready at http://localhost:4001/');
});
