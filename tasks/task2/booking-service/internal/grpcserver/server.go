package grpcserver

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	appcfg "booking-service/internal/app"
	repo "booking-service/internal/db"
	kprod "booking-service/internal/kafka"
	monocl "booking-service/internal/monolith"
	pb "booking-service/internal/pb"
)

type Server struct {
	pb.UnimplementedBookingServiceServer
	DB       *sql.DB
	Repo     repo.Repo
	Mono     monocl.Client
	Producer kprod.Producer
	Cfg      appcfg.Config
}

func idempotencyKey(ctx context.Context, fallback string) string {
	md, ok := metadata.FromIncomingContext(ctx)
	if ok {
		if v := md.Get("idempotency-key"); len(v) > 0 {
			return v[0]
		}
		if v := md.Get("x-idempotency-key"); len(v) > 0 {
			return v[0]
		}
	}
	return fallback
}

func (s *Server) CreateBooking(ctx context.Context, req *pb.BookingRequest) (*pb.BookingResponse, error) {
	if req.GetUserId() == "" || req.GetHotelId() == "" {
		return nil, status.Error(codes.InvalidArgument, "user_id and hotel_id are required")
	}
	auto := fmt.Sprintf("auto:%s:%s:%s", req.GetUserId(), req.GetHotelId(), req.GetPromoCode())
	idemp := idempotencyKey(ctx, auto)
	if b, err := s.Repo.FindByIdempotency(ctx, idemp); err == nil && b != nil {
		return &pb.BookingResponse{Id: b.ID, UserId: b.UserID, HotelId: b.HotelID, PromoCode: b.PromoCode, DiscountPercent: b.Discount, Price: b.Price, CreatedAt: b.CreatedAt.Format(time.RFC3339)}, nil
	}

	if err := s.Mono.Validate(req.GetUserId(), req.GetHotelId()); err != nil {
		return nil, status.Errorf(codes.FailedPrecondition, "validation failed: %v", err)
	}

	disc := 0.0
	if strings.TrimSpace(req.GetPromoCode()) != "" && s.Mono.ValidatePromo(req.GetPromoCode(), req.GetUserId()) {
		disc = 10.0
	}
	listPrice := s.Cfg.BasePrice
	final := listPrice * (1 - disc/100.0)

	id := uuid.New().String()
	created := time.Now().UTC()
	if err := s.Repo.Insert(ctx, id, req.GetUserId(), req.GetHotelId(), req.GetPromoCode(), listPrice, final, disc, s.Cfg.Currency, idemp, created); err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
			if b, e2 := s.Repo.FindByIdempotency(ctx, idemp); e2 == nil && b != nil {
				return &pb.BookingResponse{Id: b.ID, UserId: b.UserID, HotelId: b.HotelID, PromoCode: b.PromoCode, DiscountPercent: b.Discount, Price: b.Price, CreatedAt: b.CreatedAt.Format(time.RFC3339)}, nil
			}
		}
		return nil, status.Errorf(codes.Internal, "insert: %v", err)
	}

	_ = s.Producer.PublishCreated(ctx, id, map[string]any{
		"id":         id,
		"userId":     req.GetUserId(),
		"hotelId":    req.GetHotelId(),
		"price":      listPrice,
		"currency":   s.Cfg.Currency,
		"promoCode":  req.GetPromoCode(),
		"finalPrice": final,
	})

	return &pb.BookingResponse{Id: id, UserId: req.GetUserId(), HotelId: req.GetHotelId(), PromoCode: req.GetPromoCode(), DiscountPercent: disc, Price: final, CreatedAt: created.Format(time.RFC3339)}, nil
}

func (s *Server) ListBookings(ctx context.Context, req *pb.BookingListRequest) (*pb.BookingListResponse, error) {
	bs, err := s.Repo.ListByUser(ctx, req.GetUserId())
	if err != nil {
		return nil, status.Errorf(codes.Internal, "select: %v", err)
	}
	out := &pb.BookingListResponse{}
	for _, b := range bs {
		out.Bookings = append(out.Bookings, &pb.BookingResponse{Id: b.ID, UserId: b.UserID, HotelId: b.HotelID, PromoCode: b.PromoCode, DiscountPercent: b.Discount, Price: b.Price, CreatedAt: b.CreatedAt.Format(time.RFC3339)})
	}
	return out, nil
}
