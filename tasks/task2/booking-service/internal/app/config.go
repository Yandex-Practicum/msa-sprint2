package app

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	GRPCPort     string
	JDBCURL      string
	DBUser       string
	DBPass       string
	MonolithBase string
	KafkaBrokers string
	KafkaTopic   string
	BasePrice    float64
	Currency     string
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func FromEnv() Config {
	cfg := Config{
		GRPCPort:     getenv("GRPC_PORT", "9090"),
		JDBCURL:      getenv("DB_URL", "jdbc:postgresql://booking-db:5432/booking"),
		DBUser:       getenv("DB_USER", "booking"),
		DBPass:       getenv("DB_PASSWORD", "booking"),
		MonolithBase: getenv("MONOLITH_BASE_URL", "http://monolith:8080"),
		KafkaBrokers: getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092"),
		KafkaTopic:   getenv("KAFKA_TOPIC_BOOKING_CREATED", "booking.created"),
		Currency:     getenv("CURRENCY", "EUR"),
	}
	if bp := getenv("BASE_PRICE", ""); bp != "" {
		fmt.Sscanf(bp, "%f", &cfg.BasePrice)
	} else {
		cfg.BasePrice = 100.0
	}
	return cfg
}

func JDBCToPg(dsn, user, pass string) string {
	dsn = strings.TrimPrefix(dsn, "jdbc:")
	return fmt.Sprintf("%s://%s:%s@%s?sslmode=disable", dsn, user, pass, strings.TrimPrefix(dsn, "postgresql://"))
}
