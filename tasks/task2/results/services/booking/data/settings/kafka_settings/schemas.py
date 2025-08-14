from dataclasses import dataclass


from typing import Any, Callable, Dict


MessageType = Dict[str, Any]
PublishCallbackType = Callable[[str, MessageType], None]
