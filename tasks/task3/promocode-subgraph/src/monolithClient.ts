import axios, { AxiosInstance } from "axios";

const baseURL = process.env.MONOLITH_BASE_URL ?? "http://localhost:8084";

const client: AxiosInstance = axios.create({ baseURL, timeout: 5000 });

export interface MonolithPromoCode {
  code: string;
  discount: number;
  vipOnly: boolean;
  expired: boolean;
  validUntil: string | null;
  description: string | null;
}

export async function getPromoCode(code: string): Promise<MonolithPromoCode | null> {
  try {
    const res = await client.get<MonolithPromoCode>(`/api/promos/${encodeURIComponent(code)}`);
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function isPromoValid(code: string, isVipUser: boolean): Promise<boolean> {
  const res = await client.get<boolean>(`/api/promos/${encodeURIComponent(code)}/valid`, {
    params: { isVipUser },
  });
  return res.data === true;
}

// Тот же эндпоинт, которым уже пользуется booking-service (задание 2) для расчёта
// скидки при создании брони — переиспользуем его, чтобы "живой" пересчёт скидки
// был по той же бизнес-логике (PromoCodeService.validate в монолите).
export async function validatePromo(code: string, userId: string): Promise<MonolithPromoCode | null> {
  try {
    const res = await client.post<MonolithPromoCode>(`/api/promos/validate`, null, {
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

export async function isVipUser(userId: string): Promise<boolean> {
  const status = await getUserStatus(userId);
  return (status ?? "").toUpperCase() === "VIP";
}
