import httpx
from httpx._client import ClientState

from src.settings import get_settings

settings = get_settings()

class BaseHttpClient:
    def __init__(self):
        self._monolith_api = f"{settings.MONOLITH_BASE_URL}{settings.MONOLITH_REST_API_BASE_PATH}"
        self._client = self._get_new_client()

    def _get_new_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient()

    @property
    def client(self) -> httpx.AsyncClient:
        client_state = getattr(self._client, "_state", ClientState.CLOSED)
        need_new_client = client_state != ClientState.OPENED

        if need_new_client:
            self._client = self._get_new_client()

        return self._client

__all__ = [
    "BaseHttpClient",
]