package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"booking-history-service/internal/consumer"
	"booking-history-service/internal/repository"

	_ "github.com/lib/pq"
)

func main() {
	log.Println("Starting Booking History Service...")

	// Get environment variables
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbName := getEnv("DB_NAME", "booking_history")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	kafkaBrokers := getEnv("KAFKA_BROKERS", "localhost:9092")
	kafkaGroupID := getEnv("KAFKA_GROUP_ID", "booking-history-group")
	kafkaTopic := getEnv("KAFKA_TOPIC", "bookings")

	// Connect to database
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)
	
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	// Initialize repository
	repo := repository.NewHistoryRepository(db)
	if err := repo.InitSchema(); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}

	// Initialize Kafka consumer
	brokerList := strings.Split(kafkaBrokers, ",")
	bookingConsumer, err := consumer.NewBookingConsumer(brokerList, kafkaGroupID, kafkaTopic, repo)
	if err != nil {
		log.Fatalf("Failed to create Kafka consumer: %v", err)
	}
	defer bookingConsumer.Close()

	// Set up context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start consumer in goroutine
	go func() {
		log.Printf("Starting Kafka consumer for topic '%s' with group ID '%s'", kafkaTopic, kafkaGroupID)
		log.Printf("Kafka brokers: %s", kafkaBrokers)
		log.Printf("Database: %s", dsn)
		
		if err := bookingConsumer.Start(ctx); err != nil {
			log.Printf("Consumer error: %v", err)
			cancel()
		}
	}()

	// Wait for shutdown signal
	select {
	case sig := <-sigChan:
		log.Printf("Received signal: %v", sig)
		cancel()
	case <-ctx.Done():
		log.Println("Context cancelled")
	}

	log.Println("Booking History Service stopped")
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}