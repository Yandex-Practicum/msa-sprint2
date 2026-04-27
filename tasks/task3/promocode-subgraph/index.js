import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';

const fallbackPromos = new Map([
  [
    'TESTCODE1',
    {
      code: 'TESTCODE1',
      discount: 10,
      active: true,
      expired: false,
      vipOnly: false,
      validUntil: '2099-12-31',
      description: 'Обычный промокод',
      applicableHotels: ['test-hotel-1', 'test-hotel-2'],
    },
  ],
  [
    'TESTCODE-VIP',
    {
      code: 'TESTCODE-VIP',
      discount: 25,
      active: true,
      expired: false,
      vipOnly: true,
      validUntil: '2099-12-31',
      description: 'Повышенная VIP-скидка из сервиса промокодов',
      applicableHotels: ['test-hotel-1', 'test-hotel-2'],
    },
  ],
  [
    'SUMMER',
    {
      code: 'SUMMER',
      discount: 15,
      active: true,
      expired: false,
      vipOnly: false,
      validUntil: '2099-09-01',
      description: 'Летняя акция',
      applicableHotels: ['test-hotel-1'],
    },
  ],
]);

const typeDefs = gql`
  extend schema
    @link(
      url: "https://specs.apollo.dev/federation/v2.3"
      import: ["@key", "@external", "@requires", "@override"]
    )

  extend type Booking @key(fields: "id") {
    id: ID! @external
    hotelId: ID! @external
    promoCode: String @external
    discountPercent: Float! @override(from: "booking-subgraph") @requires(fields: "promoCode hotelId")
    discountInfo: DiscountInfo @requires(fields: "promoCode hotelId")
  }

  type PromoCode {
    code: String!
    discountPercent: Float!
    description: String
    expiresAt: String
    applicableHotels: [ID!]!
    vipOnly: Boolean!
  }

  type DiscountInfo {
    isValid: Boolean!
    originalDiscount: Float!
    finalDiscount: Float!
    description: String
    expiresAt: String
    applicableHotels: [ID!]!
  }

  type Query {
    validatePromoCode(code: String!, hotelId: ID): DiscountInfo!
    activePromoCodes: [PromoCode!]!
  }
`;

function normalizePromo(raw, code) {
  const promoCode = raw.code || code;
  return {
    code: promoCode,
    discount: Number(raw.discount ?? raw.discountPercent ?? 0),
    active: raw.active ?? !raw.expired,
    expired: Boolean(raw.expired),
    vipOnly: Boolean(raw.vipOnly ?? raw.vip_only ?? false),
    validUntil: raw.validUntil ?? raw.valid_until ?? null,
    description: raw.description ?? null,
    applicableHotels:
      raw.applicableHotels ||
      raw.applicable_hotels ||
      fallbackPromos.get(promoCode)?.applicableHotels ||
      [],
  };
}

async function fetchPromo(code) {
  if (!code) {
    return null;
  }

  try {
    const response = await fetch(`${MONOLITH_URL}/api/promos/${encodeURIComponent(code)}`);
    if (!response.ok) {
      throw new Error(`Promo REST API returned ${response.status}`);
    }
    return normalizePromo(await response.json(), code);
  } catch (error) {
    console.log(`Promo REST API is unavailable for ${code}, using demo promo: ${error.message}`);
    return fallbackPromos.get(code) || null;
  }
}

function toDiscountInfo(promo, hotelId) {
  if (!promo || promo.expired || promo.active === false) {
    return {
      isValid: false,
      originalDiscount: 0,
      finalDiscount: 0,
      description: null,
      expiresAt: null,
      applicableHotels: [],
    };
  }

  const hotelMatches =
    !hotelId ||
    promo.applicableHotels.length === 0 ||
    promo.applicableHotels.includes(String(hotelId));

  return {
    isValid: hotelMatches,
    originalDiscount: promo.discount,
    finalDiscount: hotelMatches ? promo.discount : 0,
    description: promo.description,
    expiresAt: promo.validUntil,
    applicableHotels: promo.applicableHotels,
  };
}

async function discountForBooking(booking) {
  const promo = await fetchPromo(booking.promoCode);
  return toDiscountInfo(promo, booking.hotelId);
}

const resolvers = {
  Query: {
    validatePromoCode: async (_, { code, hotelId }) => {
      return toDiscountInfo(await fetchPromo(code), hotelId);
    },
    activePromoCodes: async () => {
      return [...fallbackPromos.values()]
        .filter((promo) => !promo.expired && promo.active !== false)
        .map((promo) => ({
          code: promo.code,
          discountPercent: promo.discount,
          description: promo.description,
          expiresAt: promo.validUntil,
          applicableHotels: promo.applicableHotels,
          vipOnly: promo.vipOnly,
        }));
    },
  },
  Booking: {
    discountPercent: async (booking) => {
      const info = await discountForBooking(booking);
      return info.finalDiscount;
    },
    discountInfo: async (booking) => {
      return discountForBooking(booking);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4003 },
}).then(() => {
  console.log('✅ Promocode subgraph ready at http://localhost:4003/');
});
