import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import gql from "graphql-tag";
import { IncomingHttpHeaders } from "http";
import { listBookingsByUser } from "./grpcClient";
import { getPromoCode, isPromoValid, isVipUser, validatePromo } from "./monolithClient";

interface Ctx {
  headers: IncomingHttpHeaders;
}

interface DiscountInfo {
  isValid: boolean;
  originalDiscount: number;
  finalDiscount: number;
  description: string | null;
  expiresAt: string | null;
  applicableHotels: string[];
}

interface BookingReference {
  id: string;
  promoCode: string | null;
}

const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@external", "@requires", "@override"])

  extend type Booking @key(fields: "id") {
    id: ID! @external
    promoCode: String @external
    discountPercent: Float! @override(from: "booking-subgraph") @requires(fields: "promoCode")
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

function currentUserId(ctx: Ctx): string | undefined {
  const raw = ctx.headers["userid"];
  return Array.isArray(raw) ? raw[0] : raw;
}

const emptyDiscountInfo: DiscountInfo = {
  isValid: false,
  originalDiscount: 0,
  finalDiscount: 0,
  description: null,
  expiresAt: null,
  applicableHotels: [],
};

// "Живой" пересчёт скидки по коду — используется и для переопределённого
// discountPercent, и как finalDiscount внутри discountInfo. Через тот же
// /api/promos/validate, которым при создании брони уже пользуется booking-service.
async function liveDiscount(promoCode: string | null, userId: string | undefined): Promise<number> {
  if (!promoCode || !userId) return 0;
  const promo = await validatePromo(promoCode, userId);
  return promo ? promo.discount : 0;
}

const resolvers = {
  Booking: {
    __resolveReference: (reference: BookingReference) => reference,
    discountPercent: async (parent: BookingReference, _args: unknown, ctx: Ctx) => {
      return liveDiscount(parent.promoCode, currentUserId(ctx));
    },
    discountInfo: async (parent: BookingReference, _args: unknown, ctx: Ctx): Promise<DiscountInfo> => {
      const userId = currentUserId(ctx);
      const promoCode = parent.promoCode;
      if (!promoCode || !userId) {
        return emptyDiscountInfo;
      }
      const vip = await isVipUser(userId);
      const [bookings, promo, valid] = await Promise.all([
        listBookingsByUser(userId),
        getPromoCode(promoCode),
        isPromoValid(promoCode, vip),
      ]);
      // originalDiscount — то, что было сохранено в booking-service в момент
      // создания этой конкретной брони (могло отличаться, если промокод с тех пор поменяли).
      const original = bookings.find((b) => b.id === parent.id)?.discount_percent ?? 0;
      return {
        isValid: valid,
        originalDiscount: original,
        finalDiscount: valid ? promo?.discount ?? 0 : 0,
        description: promo?.description ?? null,
        expiresAt: promo?.validUntil ?? null,
        applicableHotels: [],
      };
    },
  },
  Query: {
    validatePromoCode: async (
      _: unknown,
      { code, hotelId }: { code: string; hotelId?: string | null },
      ctx: Ctx
    ): Promise<DiscountInfo> => {
      const userId = currentUserId(ctx);
      const vip = userId ? await isVipUser(userId) : false;
      const promo = await getPromoCode(code);
      if (!promo) {
        return { ...emptyDiscountInfo, applicableHotels: hotelId ? [hotelId] : [] };
      }
      const valid = await isPromoValid(code, vip);
      return {
        isValid: valid,
        originalDiscount: promo.discount,
        finalDiscount: valid ? promo.discount : 0,
        description: promo.description,
        expiresAt: promo.validUntil,
        applicableHotels: hotelId ? [hotelId] : [],
      };
    },
    activePromoCodes: async (): Promise<DiscountInfo[]> => {
      // Листинга промокодов в монолите нет (только get-by-code) — перебираем
      // известный набор кодов из конфига, а не трогаем монолит ради одного эндпоинта.
      const codes = (process.env.KNOWN_PROMO_CODES ?? "TESTCODE1,TESTCODE-VIP,TESTCODE-OLD")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const infos = await Promise.all(
        codes.map(async (code): Promise<DiscountInfo | null> => {
          const promo = await getPromoCode(code);
          if (!promo) return null;
          // isVipUser: true — интересует только "не истёк ли код вообще", а не
          // конкретный пользователь (это каталог кодов, а не проверка под кого-то).
          const valid = await isPromoValid(code, true);
          return {
            isValid: valid,
            originalDiscount: promo.discount,
            finalDiscount: valid ? promo.discount : 0,
            description: promo.description,
            expiresAt: promo.validUntil,
            applicableHotels: [],
          };
        })
      );

      return infos.filter((info): info is DiscountInfo => info !== null);
    },
  },
};

const server = new ApolloServer<Ctx>({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

startStandaloneServer(server, {
  listen: { port: Number(process.env.PORT ?? 4003) },
  context: async ({ req }) => ({ headers: req.headers }),
}).then(() => {
  console.log("✅ Promocode subgraph ready at http://localhost:4003/");
});
