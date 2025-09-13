import {ApolloServer} from '@apollo/server';
import {startStandaloneServer} from '@apollo/server/standalone';
import {buildSubgraphSchema} from '@apollo/subgraph';
import gql from 'graphql-tag';

const API_HOST_URL = process.env.API_HOST_URL;

const typeDefs = gql`
    type Hotel @key(fields: "id") {
        id: ID!
        name: String
        city: String
        stars: Int
    }

    type Query {
        hotelsByIds(ids: [ID!]!): [Hotel]
        hotel(id: ID!): Hotel
    }
`;

async function fetchHotelById(hotel_id) {
    console.log('FETCH HOTEL', hotel_id);

    const url = `${API_HOST_URL}/api/hotels/${hotel_id}`;

    const response = await fetch(url);
    if (response.ok) {
        const json = await response.json();
        return json;
    } else {
        console.error('Ошибка HTTP:', response.status);
        return null;
    }
}

const resolvers = {
    Hotel: {
        __resolveReference: async ({id}) => {
            console.log('RESOLVE OF HOTEL');
            return await fetchHotelById(id);
        },
    },
    Query: {
        hotelsByIds: async (_, {ids}) => {
            console.log('FETCH HOTELS');
            const hotels = await Promise.all(ids.map(id => fetchHotelById(id)));
            return hotels.filter(h => h !== null);
        }
    },
};

const server = new ApolloServer({
    schema: buildSubgraphSchema([{typeDefs, resolvers}]),
});

startStandaloneServer(server, {
    listen: {port: 4002},
}).then(() => {
    console.log('✅ Hotel subgraph ready at http://localhost:4002/');
});
