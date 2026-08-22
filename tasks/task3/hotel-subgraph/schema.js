import gql from 'graphql-tag';

export const typeDefs = gql`
  extend schema @link(
    url: "https://specs.apollo.dev/federation/v2.0",
    import: ["@key", "@shareable", "@external", "@requires", "@override"]
  )

  type Hotel @key(fields: "id") {
    id: ID!
    name: String!
    address: String!
    rating: Float
    amenities: [String!]!
    images: [String!]!
  }

  type Query {
    hotel(id: ID!): Hotel
    hotelsByIds(ids: [ID!]!): [Hotel]!
  }
`;