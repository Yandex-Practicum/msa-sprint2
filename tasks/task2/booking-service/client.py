import requests

from logger import log


class MonolithError(Exception):
    """Техническая ошибка связи с монолитом"""


class MonolithClient:
    """REST-клиент к монолиту. Зеркалит методы AppUserService, HotelService,
    ReviewService, PromoCodeService монолита"""

    def __init__(self, base_url: str, timeout: float):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})

    def get_user(self, user_id: str) -> dict:
        return self._get(f"/api/users/{user_id}")

    def get_hotel(self, hotel_id: str) -> dict:
        return self._get(f"/api/hotels/{hotel_id}")

    def is_trusted_hotel(self, hotel_id: str) -> bool:
        return bool(self._get(f"/api/reviews/hotel/{hotel_id}/trusted"))

    def get_promo_discount(self, promo_code: str, user_id: str) -> dict | None:
        try:
            r = self.session.post(
                f"{self.base_url}/api/promos/validate",
                params={"code": promo_code, "userId": user_id},
                timeout=self.timeout,
            )
        except requests.RequestException as e:
            log.warning("Promo validation request failed: %s", e)
            return None

        if r.status_code != 200:
            log.info("Promo '%s' rejected (status=%d) for user %s",
                     promo_code, r.status_code, user_id)
            return None
        return r.json()

    def _get(self, path: str):
        url = f"{self.base_url}{path}"
        try:
            r = self.session.get(url, timeout=self.timeout)
        except requests.RequestException as e:
            raise MonolithError(f"GET {url} failed: {e}") from e

        if r.status_code == 404:
            raise LookupError(f"GET {url} -> 404")
        if r.status_code >= 500:
            raise MonolithError(f"GET {url} -> {r.status_code}")
        r.raise_for_status()
        return r.json()
