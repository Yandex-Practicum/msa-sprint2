import signal
import sys

from connections import make_consumer, init_db_pool, db_pool, init_schema
from consumer import handle_booking_created
from logger import log


_shutdown = False


def _on_signal(signum, _frame):
    global _shutdown
    log.info("Received signal %d, shutting down...", signum)
    _shutdown = True


def run() -> None:
    init_db_pool()
    init_schema()
    consumer = make_consumer()

    signal.signal(signal.SIGINT, _on_signal)
    signal.signal(signal.SIGTERM, _on_signal)

    log.info("Consumer loop started")

    try:
        while not _shutdown:
            records = consumer.poll(timeout_ms=1000)

            for topic_partition, messages in records.items():
                for msg in messages:
                    try:
                        handle_booking_created(msg.value)
                    except Exception:
                        log.exception(
                            "Failed to handle event at offset %s (topic=%s, partition=%s)",
                            msg.offset, msg.topic, msg.partition,
                        )
                        continue
                    consumer.commit()

    except Exception:
        log.exception("Consumer loop crashed")
        raise
    finally:
        log.info("Closing consumer")
        consumer.close()
        log.info("Shutdown complete")
        if db_pool:
            db_pool.closeall()


if __name__ == "__main__":
    try:
        run()
    except Exception:
        log.exception("Fatal error")
        sys.exit(1)