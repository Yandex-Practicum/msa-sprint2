import logging
from typing import Optional

from src.clients.base_http_client import BaseHttpClient
from src.dto import ReadUserDto

logger = logging.getLogger(__name__)


class UsersHttpClient(BaseHttpClient):
    def __init__(self):
        super().__init__()
        self._users_api_url = f"{self._monolith_api}/users"

    async def get_user_info(self, user_id: str) -> Optional[ReadUserDto]:
        req_url = f"{self._users_api_url}/{user_id}"

        try:
            async with self.client as client:
                response = await client.get(req_url)

                return ReadUserDto(**response.json())
        except Exception as err:
            logger.exception(f"Failed to fetch a user: {str(err)}. Return None")

            return None

def get_users_http_client() -> UsersHttpClient:
    return UsersHttpClient()

__all__ = [
    "UsersHttpClient",
    "get_users_http_client",
]