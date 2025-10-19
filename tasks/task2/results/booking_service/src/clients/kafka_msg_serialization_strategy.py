import json
from typing import Any


class BaseKafkaMsgSerializeStrategy:
    def __call__(self, *args, **kwargs) -> bytes:
        pass

class KafkaJsonMsgSerializeStrategy(BaseKafkaMsgSerializeStrategy):
    def __call__(self, value: Any) -> bytes:
        return json.dumps(value).encode("utf-8")

__all__ = [
    "BaseKafkaMsgSerializeStrategy",
    "KafkaJsonMsgSerializeStrategy",
]