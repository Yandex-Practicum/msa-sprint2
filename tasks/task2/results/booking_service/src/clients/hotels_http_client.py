import logging
from typing import Optional

from src.clients.base_http_client import BaseHttpClient
from src.dto import ReadHotelDto

logger = logging.getLogger(__name__)


class HotelsHttpClient(BaseHttpClient):
    def __init__(self):
        super().__init__()
        self._hotels_api_url = f"{self._monolith_api}/hotels"

    async def get_hotel_info(self, hotel_id: str) -> Optional[ReadHotelDto]:
        req_url = f"{self._hotels_api_url}/{hotel_id}"

        try:
            async with self.client as client:
                response = await client.get(req_url)

                return ReadHotelDto(**response.json())
        except Exception as err:
            logger.exception(f"Failed to fetch a hotel: {str(err)}. Return None")

            return None

def get_hotels_http_client() -> HotelsHttpClient:
    return HotelsHttpClient()

__all__ = [
    "HotelsHttpClient",
    "get_hotels_http_client",
]