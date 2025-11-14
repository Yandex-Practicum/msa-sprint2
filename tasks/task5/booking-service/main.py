from fastapi import FastAPI
import os

app = FastAPI(title="Booking Mock Service")

@app.get("/ping")
async def ping():
    return {"status": "ok", "feature_x": os.getenv("ENABLE_FEATURE_X", "false")}

@app.get("/ready")
async def ready():
    return {"ready": True}

@app.get("/feature")
async def feature():
    enabled = os.getenv("ENABLE_FEATURE_X", "false").lower() == "true"
    return {
        "feature_x_enabled": enabled,
        "message": "Feature X ON 🚀" if enabled else "Feature X OFF 💤"
    }

@app.get("/")
async def root():
    return {"service": "booking-service", "version": "1.0.0"}
