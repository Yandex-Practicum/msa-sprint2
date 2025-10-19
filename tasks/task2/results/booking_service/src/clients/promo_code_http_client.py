import logging
from typing import Optional

from src.clients.base_http_client import BaseHttpClient
from src.dto import ReadPromoCodeDto

logger = logging.getLogger(__name__)


class PromoCodeHttpClient(BaseHttpClient):
    def __init__(self):
        super().__init__()
        self._promo_api_url = f"{self._monolith_api}/promos"

    async def get_valid_promo_code(self, code: str, user_id: str) -> Optional[ReadPromoCodeDto]:
        req_url = f"{self._promo_api_url}/validate"

        try:
            async with self.client as client:
                response = await client.post(req_url, params={
                    "code": code,
                    "userId": user_id,
                })

                return ReadPromoCodeDto(**response.json())
        except Exception as err:
            logger.exception(f"Failed to fetch valid promo code {code} for user {user_id}: {str(err)}.")

            return None

def get_promo_http_client() -> PromoCodeHttpClient:
    return PromoCodeHttpClient()

__all__ = [
    "PromoCodeHttpClient",
    "get_promo_http_client",
]