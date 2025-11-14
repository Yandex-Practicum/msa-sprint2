FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV ENABLE_FEATURE_X=true
EXPOSE 8080

HEALTHCHECK CMD curl -f http://localhost:8080/ping || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
