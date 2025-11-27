package booking

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/practikum/booking_mikro/api/gen/pb"
	"github.com/practikum/booking_mikro/internal/domain/model"
	"github.com/samber/lo"
)

type Service struct {
	pb.UnimplementedBookingServiceServer
	bookingStore  BookingeStore
	userStore     UserStore
	hotelStore    HotelStore
	promocodStore PromocodeStore
	reviewStore   ReviewStore
}

func New(bookingStore BookingeStore,
	userStore UserStore,
	hotelStore HotelStore,
	promocodStore PromocodeStore,
	reviewStore ReviewStore) *Service {
	return &Service{
		bookingStore:  bookingStore,
		userStore:     userStore,
		hotelStore:    hotelStore,
		promocodStore: promocodStore,
		reviewStore:   reviewStore,
	}
}

func (s *Service) CreateBooking(ctx context.Context, req *pb.BookingRequest) (*pb.BookingResponse, error) {
	// log.info("Creating booking: userId={}, hotelId={}, promoCode={}", userId, hotelId, promoCode);
	err := s.validateUser(req.UserId)
	if err != nil {
		return &pb.BookingResponse{}, fmt.Errorf("CreateBooking.validateUser: %w", err)
	}
	err = s.validateHotel(req.HotelId)
	if err != nil {
		return &pb.BookingResponse{}, fmt.Errorf("CreateBooking.validateHotel: %w", err)
	}

	basePrice, err := s.resolveBasePrice(req.UserId)
	if err != nil {
		return &pb.BookingResponse{}, fmt.Errorf("CreateBooking.resolveBasePrice: %w", err)
	}
	discount, err := s.resolvePromoDiscount(req.PromoCode, req.UserId)
	if err != nil {
		return &pb.BookingResponse{}, fmt.Errorf("CreateBooking.resolvePromoDiscount: %w", err)
	}

	finalPrice := basePrice - discount
	// log.info("Final price calculated: base={}, discount={}, final={}", basePrice, discount, finalPrice);
	createdAt := time.Now()
	id, err := s.bookingStore.SaveBooking(ctx, model.Booking{
		UserId:    req.UserId,
		HotelId:   req.HotelId,
		Promocode: req.PromoCode,
		Price:     finalPrice,
		CreatedAt: createdAt,
	})
	if err != nil {
		return &pb.BookingResponse{}, fmt.Errorf("CreateBooking.SaveBooking: %w", err)
	}

	return &pb.BookingResponse{
		Id:        strconv.Itoa(int(id)),
		UserId:    req.UserId,
		HotelId:   req.HotelId,
		PromoCode: req.PromoCode,
		Price:     finalPrice,
		CreatedAt: createdAt.String(),
	}, nil
}

func (s *Service) ListBookings(ctx context.Context, req *pb.BookingListRequest) (*pb.BookingListResponse, error) {
	var (
		bookings []model.Booking
		err      error
	)

	if req.UserId == "" {
		bookings, err = s.bookingStore.GetAllBookings(ctx)
		if err != nil {
			return &pb.BookingListResponse{}, fmt.Errorf("bookingStore.GetAllBookings: %w", err)
		}
	} else {
		bookings, err = s.bookingStore.GetUserBookings(ctx, req.UserId)
		if err != nil {
			return &pb.BookingListResponse{}, fmt.Errorf("bookingStore.GetUserBookings: %w", err)
		}
	}
	return &pb.BookingListResponse{
		Bookings: lo.Map(bookings, mapDomainBookingToProto),
	}, nil
}

func mapDomainBookingToProto(b model.Booking, _ int) *pb.BookingResponse {
	return &pb.BookingResponse{
		Id:              strconv.Itoa(int(b.Id)),
		UserId:          b.UserId,
		HotelId:         b.HotelId,
		PromoCode:       b.Promocode,
		DiscountPercent: b.DiscountPercent,
		Price:           b.Price,
		CreatedAt:       b.CreatedAt.String(),
	}
}

func (s *Service) validateUser(userId string) error {
	if !s.userStore.IsUserActive(userId) {
		// log.warn("User {} is inactive", userId);
		return errors.New("User is inactive")
	}
	if s.userStore.IsUserBlacklisted(userId) {
		// log.warn("User {} is blacklisted", userId);
		return errors.New("User is blacklisted")
	}
	return nil
}

func (s *Service) validateHotel(hotelId string) error {
	if !s.hotelStore.IsHotelOperational(hotelId) {
		// log.warn("Hotel {} is not operational", hotelId);
		return errors.New("Hotel is not operational")
	}
	if !s.reviewStore.IsTrustedHotel(hotelId) {
		// log.warn("Hotel {} is not trusted", hotelId);
		return errors.New("Hotel is not trusted based on reviews")
	}
	if s.hotelStore.IsHotelFullyBooked(hotelId) {
		// log.warn("Hotel {} is fully booked", hotelId);
		return errors.New("Hotel is fully booked")
	}
	return nil
}

func (s *Service) resolveBasePrice(userId string) (float64, error) {
	status, err := s.userStore.GetUserStatus(userId)
	if err != nil {
		return 0, err
	}
	if status == "VIP" {
		// log.debug("User {} has status '{}', base price is {}", userId, status, isVip ? 80.0 : 100.0);
		return 80, nil
	}
	// log.debug("User {} has unknown status, default base price 100.0", userId);
	return 100, nil
}

func (s *Service) resolvePromoDiscount(promoCode, userId string) (float64, error) {
	if promoCode == "" {
		return 0.0, nil
	}
	promo, err := s.promocodStore.Validate(promoCode, userId)
	if err != nil {
		// log.info("Promo code '{}' is invalid or not applicable for user {}", promoCode, userId);
		return 0.0, err
	}
	// log.debug("Promo code '{}' applied with discount {}", promoCode, promo.getDiscount());
	return promo, nil
}
