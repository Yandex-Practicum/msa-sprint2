import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logging.getLogger("kafka").setLevel(logging.WARNING)

log = logging.getLogger("booking-history")