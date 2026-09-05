@echo off
docker image inspect hotelio-tester-new >nul 2>&1
if errorlevel 1 (
  echo Building hotelio-tester-new image...
  cd test-new
  docker build -t hotelio-tester-new .
  cd ..
)
cd test-new && docker run --rm -e DB_HOST=host.docker.internal -e DB_PORT=5432 -e DB_NAME=hotelio_db -e DB_USER=hotelio -e DB_PASSWORD=hotelio -e API_URL=http://host.docker.internal:8084 -e GATEWAY_URL=http://host.docker.internal:4000 hotelio-tester-new
cd ..