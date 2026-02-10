import DataLoader from 'dataloader';
import fetch from 'node-fetch';

const PROMOCODE_SERVICE_URL = process.env.PROMOCODE_SERVICE_URL;

async function batchLoadPromoCodes(codes) {
  const results = await Promise.all(
    codes.map(async (code) => {
      const res = await fetch(`${PROMOCODE_SERVICE_URL}/api/promos/${code}`);

      if (!res.ok) return null;

      const promo = await res.json();

      return {
        expired: promo.expired,
        Discount: promo.discount,
        description: promo.description,
        expiresAt: promo.validUntil,
      };
    })
  );

  return results;
}

export function createPromocodeLoader() {
  return new DataLoader(batchLoadPromoCodes);
}