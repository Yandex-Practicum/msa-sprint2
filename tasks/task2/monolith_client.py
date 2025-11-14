import os
import httpx

MONOLITH_BASE = os.getenv("MONOLITH_BASE", "http://monolith:8084/api")

async def get_user(user_id: str):
    url = f"{MONOLITH_BASE}/users/{user_id}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()

async def get_hotel(hotel_id: str):
    url = f"{MONOLITH_BASE}/hotels/{hotel_id}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()

async def get_promo(promo_code: str):
    if not promo_code:
        return {"discountPercent": 0}
    url = f"{MONOLITH_BASE}/promos/{promo_code}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url)
        if r.status_code == 404:
            return {"discountPercent": 0}
        r.raise_for_status()
        return r.json()
