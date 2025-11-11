package booking_service

import (
	"database/sql"
	"log"
	"net"
	"strings"

	_ "github.com/lib/pq"
	k "github.com/segmentio/kafka-go"
	"google.golang.org/grpc"

	appcfg "booking-service/internal/app"
	dbpkg "booking-service/internal/db"
	grpcsvc "booking-service/internal/grpcserver"
	kprod "booking-service/internal/kafka"
	mono "booking-service/internal/monolith"
	pb "booking-service/internal/pb"
)

func main() {
	cfg := appcfg.FromEnv()
	dsn := appcfg.JDBCToPg(cfg.JDBCURL, cfg.DBUser, cfg.DBPass)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("db ping: %v", err)
	}
	dbpkg.MustApplyMigrations(db)

	writer := &k.Writer{Addr: k.TCP(strings.Split(cfg.KafkaBrokers, ",")...), Topic: cfg.KafkaTopic, RequiredAcks: k.RequireAll}

	s := &grpcsvc.Server{
		DB:       db,
		Repo:     dbpkg.Repo{DB: db},
		Mono:     mono.Client{Base: cfg.MonolithBase},
		Producer: kprod.Producer{Writer: writer, Topic: cfg.KafkaTopic},
		Cfg:      cfg,
	}

	lis, err := net.Listen("tcp", ":"+cfg.GRPCPort)
	if err != nil {
		log.Fatal(err)
	}
	gs := grpc.NewServer()
	pb.RegisterBookingServiceServer(gs, s)
	log.Printf("booking-service gRPC on :%s", cfg.GRPCPort)
	if err := gs.Serve(lis); err != nil {
		log.Fatal(err)
	}
}
