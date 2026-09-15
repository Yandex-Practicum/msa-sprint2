import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const BOOKING_FACADE_URL = process.env.BOOKING_FACADE_URL || 'http://monolith:8080';

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/link/v1.0", import: ["@link"])
    @link(
      url: "https://specs.apollo.dev/federation/v2.3"
      import: ["@key", "@external", "@requires", "@override"]
    )

  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    discountPercent: Float! @override(from: "booking-subgraph")
    discountInfo: DiscountInfo @requires(fields: "promoCode")
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
    activePromoCodes: [DiscountInfo!]!
  }
`;

const PROMOS = [
  {
    code: 'TESTCODE1',
    discount: 25,
    vipOnly: false,
    active: true,
    validUntil: '2026-09-30',
    description: 'Мигрирован из монолита (было 10%). Кампания 2026: скидка 25%',
    applicableHotels: [],
  },
  {
    code: 'TESTCODE-VIP',
    discount: 20,
    vipOnly: true,
    active: true,
    validUntil: '2026-12-31',
    description: 'Вип-промокод для VIP-гостей',
    applicableHotels: ['grand-central-seoul', 'paris-lumiere'],
  },
  {
    code: 'SUMMER',
    discount: 25,
    vipOnly: false,
    active: true,
    validUntil: '2026-08-31',
    description: 'Летняя кампания 2026: −25%',
    applicableHotels: [],
  },
  {
    code: 'SPRING',
    discount: 15,
    vipOnly: false,
    active: true,
    validUntil: '2026-06-30',
    description: 'Весенняя кампания 2026: −15%',
    applicableHotels: [],
  },
  {
    code: 'TESTCODE-OLD',
    discount: 5,
    vipOnly: false,
    active: false,
    validUntil: '2000-01-01',
    description: 'Истёкший промокод (для проверки deny)',
    applicableHotels: [],
  },
];

const today = () => new Date().toISOString().slice(0, 10);

function findPromo(code) {
  return PROMOS.find((p) => p.code === String(code || '').trim().toUpperCase());
}

function buildDiscountInfo(promo, originalDiscount) {
  const isValid = !!promo && promo.active && String(promo.validUntil) >= today();
  return {
    isValid,
    originalDiscount: Number(originalDiscount || 0),
    finalDiscount: isValid ? promo.discount : 0,
    description: promo ? promo.description : 'Промокод не найден',
    expiresAt: promo ? promo.validUntil : null,
    applicableHotels: promo ? promo.applicableHotels : [],
  };
}

async function fetchBookingById(id) {
  const res = await fetch(`${BOOKING_FACADE_URL}/api/bookings`);
  if (!res.ok) throw new Error(`booking facade error: HTTP ${res.status}`);
  const all = await res.json();
  return all.find((b) => String(b.id) === String(id));
}

const resolvers = {
  Booking: {
    discountPercent: (booking) => {
      const promo = findPromo(booking.promoCode);
      const isValid = !!promo && promo.active && String(promo.validUntil) >= today();
      return isValid ? promo.discount : 0;
    },
    discountInfo: async (booking) => {
      const promo = findPromo(booking.promoCode);
      const rec = await fetchBookingById(booking.id);
      const original = rec ? Number(rec.discountPercent || 0) : 0;
      return buildDiscountInfo(promo, original);
    },
  },
  Query: {
    validatePromoCode: (_, { code, hotelId }) => {
      const promo = findPromo(code);
      const info = buildDiscountInfo(promo, 0);
      if (
        hotelId &&
        info.applicableHotels.length > 0 &&
        !info.applicableHotels.includes(String(hotelId))
      ) {
        info.isValid = false;
        info.finalDiscount = 0;
        info.description = `Промокод ${code} не применим к отелю ${hotelId}`;
      }
      console.log(
        `[promocode-subgraph] validatePromoCode('${code}', hotelId=${hotelId || '-'}) -> isValid=${info.isValid}, final=${info.finalDiscount}`,
      );
      return info;
    },
    activePromoCodes: () =>
      PROMOS.filter((p) => p.active && String(p.validUntil) >= today()).map((p) =>
        buildDiscountInfo(p, 0),
      ),
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: 4003 },
  context: async ({ req }) => ({ req }),
}).then(({ url }) => {
  console.log(`[promocode-subgraph] ready at ${url}`);
});