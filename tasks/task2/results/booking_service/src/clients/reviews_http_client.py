import logging

from src.clients.base_http_client import BaseHttpClient

logger = logging.getLogger(__name__)


class ReviewsHttpClient(BaseHttpClient):
    def __init__(self):
        super().__init__()
        self._reviews_api_url = f"{self._monolith_api}/reviews/hotel"

    async def is_trusted_hotel(self, hotel_id: str) -> bool:
        req_url = f"{self._reviews_api_url}/{hotel_id}/trusted"

        try:
            async with self.client as client:
                response = await client.get(req_url)

                return bool(response.json())
        except Exception as err:
            logger.exception(f"Failed to check if a hotel {hotel_id} is trusted: {str(err)}.")

            return False

def get_reviews_http_client() -> ReviewsHttpClient:
    return ReviewsHttpClient()

__all__ = [
    "ReviewsHttpClient",
    "get_reviews_http_client",
]