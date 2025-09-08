from python:3.12.8

workdir /app
# Copy .env.local with all the credentials, because:
# 1. it's a test environment;
# 2. we don't have any secrets management yet in place.
copy requirements.txt .env.local alembic.ini /app
# Copy grpc generated as well assuming grpc api
# changes are backwards compatible
copy source/ /app/source/
run pip install --no-cache-dir --upgrade -r /app/requirements.txt
cmd ["fastapi", "run", "/app/source/app.py"]
