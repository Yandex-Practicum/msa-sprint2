package main

import (
	"booking-history-service/internal/app"
	"log"
	"os"
)

func ge(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func main() {
	cfg := app.Config{
		JDBCURL: ge("DB_URL", "jdbc:postgresql://history-db:5432/history"),
		DBUser:  ge("DB_USER", "history"),
		DBPass:  ge("DB_PASSWORD", "history"),
		Brokers: ge("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"),
		Topic:   ge("KAFKA_TOPIC_BOOKING_CREATED", "booking.created"),
		Group:   ge("KAFKA_CONSUMER_GROUP", "booking-history-service"),
	}
	if err := app.Run(cfg); err != nil {
		log.Fatal(err)
	}
}
