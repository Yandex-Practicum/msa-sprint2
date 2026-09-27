import axios, { AxiosInstance } from "axios";

const baseURL = process.env.MONOLITH_BASE_URL ?? "http://localhost:8084";

const client: AxiosInstance = axios.create({ baseURL, timeout: 5000 });

export interface MonolithHotel {
  id: string;
  operational: boolean;
  fullyBooked: boolean;
  city: string;
  rating: number;
  description: string;
}

export async function fetchHotel(id: string): Promise<MonolithHotel | null> {
  try {
    console.log(`[hotel-subgraph] REST GET /api/hotels/${id} -> монолит`);
    const res = await client.get<MonolithHotel>(`/api/hotels/${id}`);
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}
