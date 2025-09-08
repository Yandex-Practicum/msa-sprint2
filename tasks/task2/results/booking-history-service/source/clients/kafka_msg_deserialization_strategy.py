import json
from typing import Dict


class BaseKafkaMsgDeserializeStrategy:
    def __call__(self, *args, **kwargs) -> bytes:
        pass

class KafkaJsonMsgDeserializeStrategy(BaseKafkaMsgDeserializeStrategy):
    def __call__(self, value: bytes) -> Dict:
        return json.loads(value.decode("utf-8"))

__all__ = [
    "BaseKafkaMsgDeserializeStrategy",
    "KafkaJsonMsgDeserializeStrategy",
]