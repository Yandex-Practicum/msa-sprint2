"""HTTP client to monolith REST API for validation and pricing (same rules as Java BookingService)."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from booking_service.config import MONOLITH_BASE_URL

log = logging.getLogger(__name__)


class MonolithClientError(Exception):
    """Business validation failure (maps to gRPC INVALID_ARGUMENT)."""


class MonolithClient:
    def __init__(self, base_url: str | None = None, timeout: float = 30.0) -> None:
        self._base = (base_url or MONOLITH_BASE_URL).rstrip("/")
        self._client = httpx.Client(base_url=self._base, timeout=timeout)

    def close(self) -> None:
        self._client.close()

    def _get_bool(self, path: str) -> bool:
        r = self._client.get(path)
        r.raise_for_status()
        return r.json()

    def _get_text(self, path: str) -> str:
        r = self._client.get(path)
        r.raise_for_status()
        return r.text.strip().strip('"')

    def validate_and_compute(
        self, user_id: str, hotel_id: str, promo_code: str | None
    ) -> tuple[float, float]:
        """
        Returns (discount_percent, final_price).
        Raises MonolithClientError on validation failure.
        """
        if not self._get_bool(f"/api/users/{user_id}/active"):
            raise MonolithClientError("User is inactive")
        if self._get_bool(f"/api/users/{user_id}/blacklisted"):
            raise MonolithClientError("User is blacklisted")

        if not self._get_bool(f"/api/hotels/{hotel_id}/operational"):
            raise MonolithClientError("Hotel is not operational")
        if not self._get_bool(f"/api/reviews/hotel/{hotel_id}/trusted"):
            raise MonolithClientError("Hotel is not trusted based on reviews")
        if self._get_bool(f"/api/hotels/{hotel_id}/fully-booked"):
            raise MonolithClientError("Hotel is fully booked")

        status = self._get_text(f"/api/users/{user_id}/status")
        base_price = 80.0 if status.upper() == "VIP" else 100.0
        log.debug("user %s status=%s base=%s", user_id, status, base_price)

        discount = 0.0
        if promo_code:
            promo = self._validate_promo(promo_code, user_id)
            if promo is not None:
                discount = float(promo.get("discount", 0.0))
                log.debug("promo %s discount=%s", promo_code, discount)

        final_price = base_price - discount
        return discount, final_price

    def _validate_promo(self, code: str, user_id: str) -> dict[str, Any] | None:
        r = self._client.post(
            "/api/promos/validate",
            params={"code": code, "userId": user_id},
        )
        if r.status_code == 400:
            return None
        r.raise_for_status()
        return r.json()
