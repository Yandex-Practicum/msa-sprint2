package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
	"os"
	"strings"

	"booking-service/internal/client"
	"booking-service/internal/kafka"
	"booking-service/internal/repository"
	"booking-service/internal/service"
	pb "booking-service/proto"

	_ "github.com/lib/pq"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

type bookingServiceServer struct {
	pb.UnimplementedBookingServiceServer
	service *service.BookingService
}

func (s *bookingServiceServer) CreateBooking(ctx context.Context, req *pb.BookingRequest) (*pb.BookingResponse, error) {
	log.Printf("gRPC CreateBooking called: userID=%s, hotelID=%s, promoCode=%s", req.UserId, req.HotelId, req.PromoCode)

	booking, err := s.service.CreateBooking(req.UserId, req.HotelId, req.PromoCode)
	if err != nil {
		log.Printf("Failed to create booking: %v", err)
		return nil, err
	}

	return &pb.BookingResponse{
		Id:              booking.ID,
		UserId:          booking.UserID,
		HotelId:         booking.HotelID,
		PromoCode:       booking.PromoCode,
		DiscountPercent: booking.DiscountPercent,
		Price:           booking.Price,
		CreatedAt:       booking.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}, nil
}

func (s *bookingServiceServer) ListBookings(ctx context.Context, req *pb.BookingListRequest) (*pb.BookingListResponse, error) {
	log.Printf("gRPC ListBookings called: userID=%s", req.UserId)

	bookings, err := s.service.ListBookings(req.UserId)
	if err != nil {
		log.Printf("Failed to list bookings: %v", err)
		return nil, err
	}

	var pbBookings []*pb.BookingResponse
	for _, booking := range bookings {
		pbBookings = append(pbBookings, &pb.BookingResponse{
			Id:              booking.ID,
			UserId:          booking.UserID,
			HotelId:         booking.HotelID,
			PromoCode:       booking.PromoCode,
			DiscountPercent: booking.DiscountPercent,
			Price:           booking.Price,
			CreatedAt:       booking.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	return &pb.BookingListResponse{
		Bookings: pbBookings,
	}, nil
}

func main() {
	log.Println("Starting Booking Service...")

	// Get environment variables
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbName := getEnv("DB_NAME", "bookings")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	monolithURL := getEnv("MONOLITH_URL", "http://localhost:8080")
	kafkaBrokers := getEnv("KAFKA_BROKERS", "localhost:9092")
	grpcPort := getEnv("GRPC_PORT", "9090")

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
	repo := repository.NewBookingRepository(db)
	if err := repo.InitSchema(); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}

	// Initialize monolith client
	monolithClient := client.NewMonolithClient(monolithURL)

	// Initialize Kafka producer
	brokerList := strings.Split(kafkaBrokers, ",")
	kafkaProducer, err := kafka.NewProducer(brokerList, "bookings")
	if err != nil {
		log.Fatalf("Failed to create Kafka producer: %v", err)
	}
	defer kafkaProducer.Close()

	// Initialize service
	bookingService := service.NewBookingService(repo, monolithClient, kafkaProducer)

	// Start gRPC server
	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("Failed to listen on port %s: %v", grpcPort, err)
	}

	grpcServer := grpc.NewServer()
	
	// Register the BookingService properly
	pb.RegisterBookingServiceServer(grpcServer, &bookingServiceServer{service: bookingService})
	
	// Enable reflection for easier debugging
	reflection.Register(grpcServer)

	log.Printf("Booking Service listening on port %s", grpcPort)
	log.Printf("Monolith URL: %s", monolithURL)
	log.Printf("Kafka brokers: %s", kafkaBrokers)
	log.Printf("Database: %s", dsn)
	
	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("Failed to serve gRPC: %v", err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}