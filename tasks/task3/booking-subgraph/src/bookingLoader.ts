import DataLoader from "dataloader";
import { listBookingsByUser, GrpcBooking } from "./grpcClient";

export interface Booking {
  id: string;
  userId: string;
  hotelId: string;
  promoCode: string | null;
  discountPercent: number;
}

function toBooking(b: GrpcBooking): Booking {
  return {
    id: b.id,
    userId: b.user_id,
    hotelId: b.hotel_id,
    promoCode: b.promo_code || null,
    discountPercent: b.discount_percent,
  };
}

// Один DataLoader на запрос: если в рамках одного GraphQL-запроса список бронирований
// пользователя нужен несколько раз (userBookings + несколько __resolveReference при
// джойне с promocode-subgraph), gRPC ListBookings вызывается только один раз на userId.
export function createBookingLoader(): DataLoader<string, Booking[]> {
  return new DataLoader(async (userIds: readonly string[]) => {
    return Promise.all(userIds.map(async (userId) => (await listBookingsByUser(userId)).map(toBooking)));
  });
}
