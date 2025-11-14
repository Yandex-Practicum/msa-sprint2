import asyncio
from consumer import consume_booking_events

async def main():
    print("🚀 Booking-history service started, listening Kafka...")
    await consume_booking_events()

if __name__ == "__main__":
    asyncio.run(main())
