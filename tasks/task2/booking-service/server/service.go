package main

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/samber/lo"

	"booking-service/server/db"
	models2 "booking-service/server/models"
	"booking-service/server/monolit"
	"booking-service/server/monolit/models"
	kafka "booking-service/server/producer"
)

type Service struct {
	monolit  monolit.Service
	repo     db.Repo
	producer kafka.Producer
}

func NewService(monolit monolit.Service, repo db.Repo, producer kafka.Producer) Service {
	return Service{monolit: monolit, repo: repo, producer: producer}
}

func (s Service) CreateBooking(ctx context.Context, userID string, hotelID string, promoCode string) (models2.Booking, error) {
	user, err := s.monolit.GetUser(ctx, userID)
	if err != nil {
		return models2.Booking{}, fmt.Errorf("failed to get user: %w", err)
	}
	if err = s.validateUser(ctx, user); err != nil {
		return models2.Booking{}, fmt.Errorf("failed to validate user: %w", err)
	}
	if err = s.validateHotel(ctx, hotelID); err != nil {
		return models2.Booking{}, fmt.Errorf("failed to validate hotel: %w", err)
	}
	basePrice := resolveBasePrice(user)
	discount := s.resolvePromoDiscount(ctx, promoCode, user.ID)
	finalPrice := basePrice - discount

	b, err := s.repo.Save(ctx, models2.Booking{
		UserID:          userID,
		HotelID:         hotelID,
		PromoCode:       lo.EmptyableToPtr(promoCode),
		DiscountPercent: lo.EmptyableToPtr(discount),
		Price:           finalPrice,
		CreatedAt:       time.Time{},
	})
	if err != nil {
		return models2.Booking{}, fmt.Errorf("failed to save booking: %w", err)
	}
	return b, s.producer.SendBookingCreated(ctx, b)
}

func (s Service) resolvePromoDiscount(ctx context.Context, promoCode string, userID string) float64 {
	if promoCode == "" {
		return 0.0
	}

	promoValidation, _ := s.monolit.ValidatePromo(ctx, promoCode, userID)
	return promoValidation.DiscountPercent
}

func resolveBasePrice(user models.User) float64 {
	return float64(lo.Ternary(strings.ToLower(user.Status) == "vip", 80, 100))
}

func (s Service) validateHotel(ctx context.Context, hotelID string) error {
	check := func(call func(ctx context.Context, hotelID string) (bool, error), check func(bool) error) error {
		result, err := call(ctx, hotelID)
		if err != nil {
			return err
		}
		return check(result)
	}
	var err error
	if err = check(s.monolit.IsHotelOperational, func(isHotelOperational bool) error {
		return lo.Ternary(isHotelOperational, nil, errors.New("hotel is not operational"))
	}); err != nil {
		return err
	}

	if err = check(s.monolit.IsReviewsHotelTrusted, func(isTrusted bool) error {
		return lo.Ternary(isTrusted, nil, errors.New("hotel is not trusted"))
	}); err != nil {
		return err
	}

	if err = check(s.monolit.IsHotelFullyBooked, func(fullyBooked bool) error {
		return lo.Ternary(fullyBooked, errors.New("hotel is fully booked"), nil)
	}); err != nil {
		return err
	}
	return nil
}

func (s Service) validateUser(ctx context.Context, user models.User) error {
	if !user.Active {
		return errors.New("user is not active")
	}
	if user.Blacklisted {
		return errors.New("user is blacklisted")
	}
	return nil
}
