для запуска regress.sh

cd task2/results

docker build --no-cache -t regress-runner -f Dockerfile.regress .

docker run --rm --network hotelio-net `
  -v "${PWD}\..\booking-service\app:/work/app:ro" `
  -e BOOKING_SERVICE_HOST=booking-service `
  -e BOOKING_SERVICE_PORT=9090 `
  -e DB_HOST=booking-history-db `
  -e DB_PORT=5432 `
  -e DB_NAME=booking_history `
  -e DB_USER=history `
  -e DB_PASSWORD=history `
  -e N=5 `
  regress-runner