import { AppDataSource } from "./dataSource";
import { Booking } from "./entity/Booking";
import {
  getUserStatus,
  isHotelFullyBooked,
  isHotelOperational,
  isTrustedHotel,
  isUserActive,
  isUserBlacklisted,
  validatePromo,
} from "./monolithClient";
import { publishBookingCreated } from "./kafkaProducer";

export class ValidationError extends Error {}

async function validateUser(userId: string): Promise<void> {
  if (!(await isUserActive(userId))) {
    throw new ValidationError("User is inactive");
  }
  if (await isUserBlacklisted(userId)) {
    throw new ValidationError("User is blacklisted");
  }
}

async function validateHotel(hotelId: string): Promise<void> {
  if (!(await isHotelOperational(hotelId))) {
    throw new ValidationError("Hotel is not operational");
  }
  if (!(await isTrustedHotel(hotelId))) {
    throw new ValidationError("Hotel is not trusted based on reviews");
  }
  if (await isHotelFullyBooked(hotelId)) {
    throw new ValidationError("Hotel is fully booked");
  }
}

async function resolveBasePrice(userId: string): Promise<number> {
  const status = await getUserStatus(userId);
  return status?.toUpperCase() === "VIP" ? 80.0 : 100.0;
}

async function resolvePromoDiscount(promoCode: string | null, userId: string): Promise<number> {
  if (!promoCode) {
    return 0.0;
  }
  const promo = await validatePromo(promoCode, userId);
  return promo ? promo.discount : 0.0;
}

export async function createBooking(
  userId: string,
  hotelId: string,
  promoCode: string | null
): Promise<Booking> {
  await validateUser(userId);
  await validateHotel(hotelId);

  const basePrice = await resolveBasePrice(userId);
  const discount = await resolvePromoDiscount(promoCode, userId);
  const finalPrice = basePrice - discount;

  const repo = AppDataSource.getRepository(Booking);
  const booking = repo.create({
    userId,
    hotelId,
    promoCode: promoCode ?? null,
    discountPercent: discount,
    price: finalPrice,
  });
  const saved = await repo.save(booking);

  await publishBookingCreated(saved);

  return saved;
}

export async function listBookings(userId?: string | null): Promise<Booking[]> {
  const repo = AppDataSource.getRepository(Booking);
  if (userId) {
    return repo.find({ where: { userId } });
  }
  return repo.find();
}
