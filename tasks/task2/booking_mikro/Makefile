CURR_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
MIGRATIONS_DIR := ./migration/pg

.PHONY: gen-proto
gen-proto:
	docker run --rm -v ${CURR_DIR}:/src/ -w /src/ rvolosatovs/protoc:v4.1.0 --proto_path=./api/proto/  --go_out=./ --go-grpc_out=./ ./api/proto/booking.proto
