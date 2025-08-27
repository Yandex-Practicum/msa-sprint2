from fastapi import FastAPI, Query, HTTPException
from booking_service import list_bookings
import uvicorn
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("booking-rest")

app = FastAPI()

@app.get("/api/bookings")
def get_bookings(user_id: str = Query(None)):
    logger.info("GET /api/bookings called with user_id=%s", user_id)
    try:
        bookings = list_bookings(user_id)
        result = [
            {
                "id": b.id,
                "user_id": b.user_id,
                "hotel_id": b.hotel_id,
                "promo_code": b.promo_code or "",
                "discount_percent": b.discount_percent or 0.0,
                "price": b.price,
                "created_at": b.created_at.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
            } for b in bookings
        ]
        logger.info("Returning %d bookings", len(result))
        return result
    except Exception as e:
        logger.exception("Error while fetching bookings")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    logger.info("Starting REST API server on port 8080")
    uvicorn.run(app, host="0.0.0.0", port=8080)
