import axios, { AxiosInstance } from "axios";

const baseURL = process.env.MONOLITH_BASE_URL ?? "http://localhost:8084";

const client: AxiosInstance = axios.create({ baseURL, timeout: 5000 });

export interface PromoCode {
  code: string;
  discount: number;
  vipOnly: boolean;
  expired: boolean;
  validUntil: string | null;
  description: string | null;
}

export async function isUserActive(userId: string): Promise<boolean> {
  const res = await client.get<boolean>(`/api/users/${userId}/active`);
  return res.data === true;
}

export async function isUserBlacklisted(userId: string): Promise<boolean> {
  const res = await client.get<boolean>(`/api/users/${userId}/blacklisted`);
  return res.data === true;
}

export async function getUserStatus(userId: string): Promise<string | null> {
  try {
    const res = await client.get<string>(`/api/users/${userId}/status`);
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function isHotelOperational(hotelId: string): Promise<boolean> {
  const res = await client.get<boolean>(`/api/hotels/${hotelId}/operational`);
  return res.data === true;
}

export async function isHotelFullyBooked(hotelId: string): Promise<boolean> {
  const res = await client.get<boolean>(`/api/hotels/${hotelId}/fully-booked`);
  return res.data === true;
}

export async function isTrustedHotel(hotelId: string): Promise<boolean> {
  const res = await client.get<boolean>(`/api/reviews/hotel/${hotelId}/trusted`);
  return res.data === true;
}

export async function validatePromo(code: string, userId: string): Promise<PromoCode | null> {
  try {
    const res = await client.post<PromoCode>(`/api/promos/validate`, null, {
      params: { code, userId },
    });
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 400) {
      return null;
    }
    throw err;
  }
}
