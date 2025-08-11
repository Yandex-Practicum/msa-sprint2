from dataclasses import dataclass


from typing import Any, Callable, Dict


@dataclass
class MessageSchema:
    data: Dict[str, Any]


PublishCallbackType = Callable[[MessageSchema, str], None]