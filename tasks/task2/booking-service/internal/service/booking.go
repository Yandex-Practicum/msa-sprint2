package service

import (
	"fmt"
	"log"
	"time"

	"booking-service/internal/client"
	"booking-service/internal/kafka"
	"booking-service/internal/models"
	"booking-service/internal/repository"
)

type BookingService struct {
	repo           *repository.BookingRepository
	monolithClient *client.MonolithClient
	kafkaProducer  *kafka.Producer
}

func NewBookingService(repo *repository.BookingRepository, monolithClient *client.MonolithClient, kafkaProducer *kafka.Producer) *BookingService {
	return &BookingService{
		repo:           repo,
		monolithClient: monolithClient,
		kafkaProducer:  kafkaProducer,
	}
}

func (s *BookingService) CreateBooking(userID, hotelID, promoCode string) (*models.Booking, error) {
	log.Printf("Creating booking: userID=%s, hotelID=%s, promoCode=%s", userID, hotelID, promoCode)

	// Validate user
	if err := s.validateUser(userID); err != nil {
		return nil, fmt.Errorf("user validation failed: %w", err)
	}

	// Validate hotel
	if err := s.validateHotel(hotelID); err != nil {
		return nil, fmt.Errorf("hotel validation failed: %w", err)
	}

	// Calculate price
	basePrice, err := s.resolveBasePrice(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve base price: %w", err)
	}

	discount, err := s.resolvePromoDiscount(promoCode, userID)
	if err != nil {
		log.Printf("Failed to resolve promo discount: %v", err)
		discount = 0 // Continue without discount if promo fails
	}

	finalPrice := basePrice - discount
	log.Printf("Final price calculated: base=%.2f, discount=%.2f, final=%.2f", basePrice, discount, finalPrice)

	// Create booking
	booking := &models.Booking{
		ID:              generateBookingID(),
		UserID:          userID,
		HotelID:         hotelID,
		PromoCode:       promoCode,
		DiscountPercent: discount,
		Price:           finalPrice,
		CreatedAt:       time.Now(),
	}

	// Save to database
	if err := s.repo.Create(booking); err != nil {
		return nil, fmt.Errorf("failed to save booking: %w", err)
	}

	// Publish to Kafka
	if err := s.kafkaProducer.PublishBookingCreated(booking); err != nil {
		log.Printf("Failed to publish booking event to Kafka: %v", err)
		// Don't fail the booking creation if Kafka is down
	}

	return booking, nil
}

func (s *BookingService) ListBookings(userID string) ([]*models.Booking, error) {
	if userID != "" {
		return s.repo.GetByUserID(userID)
	}
	return s.repo.GetAll()
}

func (s *BookingService) validateUser(userID string) error {
	active, err := s.monolithClient.IsUserActive(userID)
	if err != nil {
		return fmt.Errorf("failed to check user active status: %w", err)
	}
	if !active {
		return fmt.Errorf("user %s is inactive", userID)
	}

	blacklisted, err := s.monolithClient.IsUserBlacklisted(userID)
	if err != nil {
		return fmt.Errorf("failed to check user blacklist status: %w", err)
	}
	if blacklisted {
		return fmt.Errorf("user %s is blacklisted", userID)
	}

	return nil
}

func (s *BookingService) validateHotel(hotelID string) error {
	operational, err := s.monolithClient.IsHotelOperational(hotelID)
	if err != nil {
		return fmt.Errorf("failed to check hotel operational status: %w", err)
	}
	if !operational {
		return fmt.Errorf("hotel %s is not operational", hotelID)
	}

	trusted, err := s.monolithClient.IsHotelTrusted(hotelID)
	if err != nil {
		return fmt.Errorf("failed to check hotel trust status: %w", err)
	}
	if !trusted {
		return fmt.Errorf("hotel %s is not trusted", hotelID)
	}

	fullyBooked, err := s.monolithClient.IsHotelFullyBooked(hotelID)
	if err != nil {
		return fmt.Errorf("failed to check hotel booking status: %w", err)
	}
	if fullyBooked {
		return fmt.Errorf("hotel %s is fully booked", hotelID)
	}

	return nil
}

func (s *BookingService) resolveBasePrice(userID string) (float64, error) {
	status, err := s.monolithClient.GetUserStatus(userID)
	if err != nil {
		log.Printf("Failed to get user status for %s, using default price: %v", userID, err)
		return 100.0, nil
	}

	if status == "VIP" {
		return 80.0, nil
	}

	return 100.0, nil
}

func (s *BookingService) resolvePromoDiscount(promoCode, userID string) (float64, error) {
	if promoCode == "" {
		return 0.0, nil
	}

	promo, err := s.monolithClient.ValidatePromoCode(promoCode, userID)
	if err != nil {
		return 0.0, fmt.Errorf("invalid promo code: %w", err)
	}

	return promo.Discount, nil
}

func generateBookingID() string {
	return fmt.Sprintf("booking_%d", time.Now().UnixNano())
}

// Helper functions to convert between models and protobuf
func (s *BookingService) BookingToProto(booking *models.Booking) *BookingResponse {
	return &BookingResponse{
		Id:              booking.ID,
		UserId:          booking.UserID,
		HotelId:         booking.HotelID,
		PromoCode:       booking.PromoCode,
		DiscountPercent: booking.DiscountPercent,
		Price:           booking.Price,
		CreatedAt:       booking.CreatedAt.Format(time.RFC3339),
	}
}

// This needs to be defined separately for protobuf compatibility
type BookingResponse struct {
	Id              string  `protobuf:"bytes,1,opt,name=id,proto3" json:"id,omitempty"`
	UserId          string  `protobuf:"bytes,2,opt,name=user_id,json=userId,proto3" json:"user_id,omitempty"`
	HotelId         string  `protobuf:"bytes,3,opt,name=hotel_id,json=hotelId,proto3" json:"hotel_id,omitempty"`
	PromoCode       string  `protobuf:"bytes,4,opt,name=promo_code,json=promoCode,proto3" json:"promo_code,omitempty"`
	DiscountPercent float64 `protobuf:"fixed64,5,opt,name=discount_percent,json=discountPercent,proto3" json:"discount_percent,omitempty"`
	Price           float64 `protobuf:"fixed64,6,opt,name=price,proto3" json:"price,omitempty"`
	CreatedAt       string  `protobuf:"bytes,7,opt,name=created_at,json=createdAt,proto3" json:"created_at,omitempty"`
}