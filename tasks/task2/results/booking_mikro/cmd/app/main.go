package main

import (
	"database/sql"
	"fmt"
	"log"
	"net"

	"github.com/practikum/booking_mikro/api/gen/pb"
	"github.com/practikum/booking_mikro/internal/service/booking"
	"github.com/practikum/booking_mikro/internal/storage/hotel"
	"github.com/practikum/booking_mikro/internal/storage/postgres"
	"github.com/practikum/booking_mikro/internal/storage/promocod"
	"github.com/practikum/booking_mikro/internal/storage/review"
	"github.com/practikum/booking_mikro/internal/storage/user"
	"google.golang.org/grpc"
)

var (
	storagePath string = "postgresql://hotelio:hotelio@monolith-db:5432/booking_srv?sslmode=disable"
	url         string
)

func main() {
	//init db
	db, err := sql.Open("pgx", storagePath)
	if err != nil {
		log.Fatal(err)
	}
	bookStore := postgres.New(db)

	//storages
	userStore := user.New(url)
	hotelStore := hotel.New(url)
	promoStore := promocod.New(url)
	reviewStore := review.New(url)

	//server
	bookingServer := booking.New(bookStore, userStore, hotelStore, promoStore, reviewStore)
	// определяем порт для сервера
	listen, err := net.Listen("tcp", ":9090")
	if err != nil {
		log.Fatal(err)
	}
	// создаём gRPC-сервер без зарегистрированной службы
	s := grpc.NewServer()
	// регистрируем сервис
	pb.RegisterBookingServiceServer(s, bookingServer)

	fmt.Println("Сервер gRPC начал работу")
	// получаем запрос gRPC
	if err := s.Serve(listen); err != nil {
		log.Fatal(err)
	}
}
