import DataLoader from 'dataloader';
import fetch from 'node-fetch';

const HOTEL_SERVICE_URL = process.env.HOTEL_SERVICE_URL || "http://localhost:8080";

async function batchLoadHotels(ids) {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(
          `${HOTEL_SERVICE_URL}/api/hotels/${id}`
        );

        if (!res.ok) {
          return null;
        }

        const hotel = await res.json();

        // REST → GraphQL mapping
        return {
          id: hotel.id,
          name: hotel.description,
          city: hotel.city,
          stars: Math.round(hotel.rating),
        };
      } catch (err) {
        console.error(`Hotel fetch failed for id=${id}`, err);
        return null;
      }
    })
  );

  return results;
}

export function createHotelLoader() {
  return new DataLoader(batchLoadHotels, {
    cache: true,
    maxBatchSize: 50,
  });
}