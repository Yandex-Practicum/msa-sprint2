package main

import (
	"context"
	"log"
	"net"
	"os"
	"strconv"
	"time"

	"github.com/samber/lo"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"

	_ "github.com/lib/pq"

	pb "booking-service/generated/proto"
	db2 "booking-service/server/db"
	"booking-service/server/monolit"
	kafka "booking-service/server/producer"
)

type bookingServer struct {
	pb.UnimplementedBookingServiceServer
	repo    db2.Repo
	service Service
}

func (s *bookingServer) CreateBooking(ctx context.Context, req *pb.BookingRequest) (*pb.BookingResponse, error) {
	b, err := s.service.CreateBooking(ctx, req.UserId, req.HotelId, req.PromoCode)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "could not create booking: %v", err)
	}

	return &pb.BookingResponse{
		Id:              strconv.FormatInt(b.ID, 10),
		UserId:          b.UserID,
		HotelId:         b.HotelID,
		PromoCode:       lo.FromPtr(b.PromoCode),
		DiscountPercent: lo.FromPtr(b.DiscountPercent),
		Price:           b.Price,
		CreatedAt:       b.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (s *bookingServer) ListBookings(ctx context.Context, req *pb.BookingListRequest) (*pb.BookingListResponse, error) {
	log.Printf("income: ListBookings. user-id: %s", req.UserId)
	// Получаем бронирования из репозитория
	bookings, err := s.repo.ListAll(ctx, req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get bookings: %v", err)
	}

	// Преобразуем каждое бронирование в protobuf-формат
	pbBookings := make([]*pb.BookingResponse, 0, len(bookings))
	for _, booking := range bookings {
		pbBooking := &pb.BookingResponse{
			Id:        strconv.FormatInt(booking.ID, 10),
			UserId:    booking.UserID,
			HotelId:   booking.HotelID,
			Price:     booking.Price,
			CreatedAt: booking.CreatedAt.Format(time.RFC3339),
		}

		// Обрабатываем nullable поля
		if booking.PromoCode != nil {
			pbBooking.PromoCode = *booking.PromoCode
		}
		if booking.DiscountPercent != nil {
			pbBooking.DiscountPercent = *booking.DiscountPercent
		}

		pbBookings = append(pbBookings, pbBooking)
	}

	// Формируем ответ
	return &pb.BookingListResponse{
		Bookings: pbBookings,
	}, nil
}

func main() {
	db := db2.CreateDB()
	defer db.Close()
	monolithHost := "http://" + db2.GetEnv("MONOLITH_HOST", "localhost:8084")

	repo := db2.NewRepo(db)
	producer := kafka.NewProducer(os.Getenv("KAFKA_BROKER"))
	service := NewService(monolit.NewService(monolithHost), repo, producer)

	lis, err := net.Listen("tcp", ":9090")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterBookingServiceServer(s, &bookingServer{service: service, repo: repo})
	reflection.Register(s)
	log.Printf("Server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
