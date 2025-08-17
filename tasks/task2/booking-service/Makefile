install_deps:
	go get google.golang.org/grpc && \
    go get google.golang.org/protobuf && \
    go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

gen_proto:
	protoc --go_out=. --go-grpc_out=. proto/booking.proto

run_booking_service:
	 docker build -t booking-service . &&  docker run -e MONOLITH_HOST="http://localhost:8084" --rm -p 9091:9090 --name booking-service booking-service

run:
	docker compose up -d --build
