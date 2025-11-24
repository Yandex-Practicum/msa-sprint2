import os
import uvicorn
from fastapi import FastAPI

app = FastAPI()

ENABLE_FEATURE_X = os.environ.get('ENABLE_FEATURE_X') == 'true'

@app.get('/ping')
def ping():
    return 'pong'

@app.get('/health')
def health():
    return 'OK'

if ENABLE_FEATURE_X:
    @app.get('/feature')
    def enable_feature_x():
        return 'Feature X is enabled'


if __name__ == '__main__':
    uvicorn.run(app, host="0.0.0.0", port=8080)