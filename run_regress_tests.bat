@echo off
docker image inspect hotelio-tester >nul 2>&1
if errorlevel 1 (
  echo Building hotelio-tester image...
  cd test
  docker build -t hotelio-tester .
  cd ..
)
cd test && docker run --rm -e DB_HOST=host.docker.internal -e DB_PORT=5432 -e DB_NAME=hotelio_db -e DB_USER=hotelio -e DB_PASSWORD=hotelio -e API_URL=http://host.docker.internal:8084 hotelio-tester
cd ..