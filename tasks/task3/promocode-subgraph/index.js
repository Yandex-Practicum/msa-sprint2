import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

// ---------------------------------------------------------------------------
// promocode-subgraph — домен промокодов, выделенный из booking. Реальный
// источник — монолит Hotelio (REST): GET /api/promos/{code},
// POST /api/promos/validate?code=..&userId=...
// discountPercent переопределён (@override from booking) и резолвится отсюда
// по актуальному состоянию промокода.
// ---------------------------------------------------------------------------
const MONOLITH_URL = process.env.MONOLITH_URL || 'http://hotelio-monolith:8080';

async function fetchJson(url, opts) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(url, Object.assign({ signal: ctrl.signal }, opts));
    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Поля DiscountInfo на основе ответа монолита {code, discount, vipOnly, expired, validUntil, description}
function toDiscountInfo(promo, isVip) {
  if (!promo) {
    return { isValid: false, originalDiscount: 0, finalDiscount: 0, description: 'Промокод не найден', expiresAt: null, applicableHotels: [] };
  }
  const blocked = promo.vipOnly && !isVip;
  const inactive = promo.expired;
  return {
    isValid: !blocked && !inactive,
    originalDiscount: promo.discount ?? 0,
    finalDiscount: !blocked && !inactive ? promo.discount ?? 0 : 0,
    description: promo.description || null,
    expiresAt: promo.validUntil || null,
    applicableHotels: [],
  };
}

async function fetchPromo(code) {
  if (!code) return null;
  return fetchJson(`${MONOLITH_URL}/api/promos/${encodeURIComponent(code)}`);
}

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@external", "@override", "@requires", "@shareable"])

  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    discountPercent: Float @requires(fields: "promoCode") @override(from: "booking")
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

const resolvers = {
  Booking: {
    discountPercent: async (booking) => {
      const promo = await fetchPromo(booking.promoCode);
      const r = toDiscountInfo(promo, false);
      console.log(`[promocode-subgraph] Booking.discountPercent(promoCode=${booking.promoCode}) -> ${r.finalDiscount}`);
      return r.finalDiscount;
    },
    discountInfo: async (booking) => {
      const promo = await fetchPromo(booking.promoCode);
      const r = toDiscountInfo(promo, false);
      console.log(`[promocode-subgraph] Booking.discountInfo(promoCode=${booking.promoCode}) -> isValid=${r.isValid} final=${r.finalDiscount}`);
      return r;
    },
  },
  Query: {
    validatePromoCode: async (_, { code }) => {
      const promo = await fetchPromo(code);
      const r = toDiscountInfo(promo, false);
      console.log(`[promocode-subgraph] validatePromoCode(code=${code}) -> isValid=${r.isValid}`);
      return r;
    },
    activePromoCodes: async () => {
      // Монолит не отдаёт список промокодов одним запросом; перебираем
      // известные коды из каталога. В реальной системе здесь был бы
      // запрос к promo-сервису.
      const codes = ['TESTCODE1', 'TESTCODE-VIP', 'TESTCODE-OLD'];
      const out = [];
      for (const code of codes) {
        const promo = await fetchPromo(code);
        const r = toDiscountInfo(promo, false);
        if (r.isValid) out.push(r);
      }
      console.log(`[promocode-subgraph] activePromoCodes -> ${out.length}`);
      return out;
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
