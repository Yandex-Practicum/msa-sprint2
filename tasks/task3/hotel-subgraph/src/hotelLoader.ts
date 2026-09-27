import DataLoader from "dataloader";
import { fetchHotel, MonolithHotel } from "./monolithClient";

export interface Hotel {
  id: string;
  name: string;
  city: string | null;
  rating: number | null;
  description: string | null;
  operational: boolean | null;
  fullyBooked: boolean | null;
}

const TTL_MS = 30_000;
const cache = new Map<string, { hotel: Hotel | null; expiresAt: number }>();

// В монолите у Hotel нет поля name (только id, city, rating, description,
// operational, fullyBooked) — собираем читаемое имя из id, а не выдумываем данные.
function prettyName(id: string): string {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function toHotel(h: MonolithHotel): Hotel {
  return {
    id: h.id,
    name: prettyName(h.id),
    city: h.city,
    rating: h.rating,
    description: h.description,
    operational: h.operational,
    fullyBooked: h.fullyBooked,
  };
}

async function loadOne(id: string): Promise<Hotel | null> {
  const cached = cache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.hotel;
  }
  const monolithHotel = await fetchHotel(id);
  const hotel = monolithHotel ? toHotel(monolithHotel) : null;
  cache.set(id, { hotel, expiresAt: Date.now() + TTL_MS });
  return hotel;
}

// DataLoader живёт один GraphQL-запрос (создаётся в context()) — это решает N+1:
// несколько бронирований с одним и тем же hotelId схлопываются в один вызов
// batch-функции и один REST-запрос к монолиту. Сама batch-функция читает/пишет
// модульный TTL-кеш, общий для всех запросов процесса, — гасит повторные REST-вызовы
// и между разными запросами, а не только внутри одного.
export function createHotelLoader(): DataLoader<string, Hotel | null> {
  return new DataLoader(async (ids: readonly string[]) => {
    // Один вызов batch-функции = один "тик" DataLoader'а. Если в запросе было
    // 3 бронирования на один и тот же отель, сюда придёт ["id","id","id"], но
    // DataLoader дедуплицирует ключи ДО вызова batch-функции — ids ниже уникальны.
    console.log(`[hotel-subgraph] batch load: ${ids.length} уникальных hotelId — ${JSON.stringify(ids)}`);
    return Promise.all(ids.map((id) => loadOne(id)));
  });
}
