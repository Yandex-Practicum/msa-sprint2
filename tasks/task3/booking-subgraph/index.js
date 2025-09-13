import {ApolloServer} from '@apollo/server';
import {startStandaloneServer} from '@apollo/server/standalone';
import {buildSubgraphSchema} from '@apollo/subgraph';
import gql from 'graphql-tag';
import {ForbiddenError} from 'apollo-server-errors'

const API_HOST_URL = process.env.API_HOST_URL;

async function fetchUserBookings(userid) {
    const url = `${API_HOST_URL}/api/bookings?userId=${userid}`;

    const response = await fetch(url);
    if (response.ok) {
        const json = await response.json();
        console.log(json);
        return json;
    } else {
        console.error('Ошибка HTTP:', response.status);
        return null;
    }
}

const typeDefs = gql`
    type Booking @key(fields: "id") {
        id: ID!
        userId: String!
        hotelId: String!
        promoCode: String
        discountPercent: Int
        hotel: Hotel
    }

    extend type Hotel @key(fields: "id") {
        id: ID! @external
    }

    type Query {
        bookingsByUser(userId: String!): [Booking]
    }
`;


const resolvers = {
    Query: {
        bookingsByUser: async (_, {userId}, {req}) => {

            if (userId !== req.headers['userid']) {
                console.log(`Access denied for user ${req.headers['userid']}`);
                throw new ForbiddenError(`User ${req.headers['userid']} is not authorized to get not belonging bookings.`);
            }
            const bookings = await fetchUserBookings(userId);
            const result = bookings.filter(booking => booking.userId === req.headers['userid']);
            return result;
        },
    },
    Booking: {
        hotel(_parent) {
            console.log('RESOLVE BOOKING HOTEL ');
            return {__typename: 'Hotel', id: _parent.hotelId}
        }
    },
};

const server = new ApolloServer({
    schema: buildSubgraphSchema([{typeDefs, resolvers}]),
});

startStandaloneServer(server, {
    listen: {port: 4001},
    context: async ({req}) => ({req})
}).then(() => {
    console.log('✅ Booking subgraph ready at http://localhost:4001/');
});