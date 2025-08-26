package models

import (
	"time"
)

type BookingEvent struct {
	BookingID       string    `json:"booking_id"`
	UserID          string    `json:"user_id"`
	HotelID         string    `json:"hotel_id"`
	PromoCode       string    `json:"promo_code"`
	DiscountPercent float64   `json:"discount_percent"`
	Price           float64   `json:"price"`
	CreatedAt       time.Time `json:"created_at"`
	EventType       string    `json:"event_type"`
}

type BookingHistory struct {
	ID              int       `json:"id" db:"id"`
	BookingID       string    `json:"booking_id" db:"booking_id"`
	UserID          string    `json:"user_id" db:"user_id"`
	HotelID         string    `json:"hotel_id" db:"hotel_id"`
	PromoCode       string    `json:"promo_code" db:"promo_code"`
	DiscountPercent float64   `json:"discount_percent" db:"discount_percent"`
	Price           float64   `json:"price" db:"price"`
	EventType       string    `json:"event_type" db:"event_type"`
	ProcessedAt     time.Time `json:"processed_at" db:"processed_at"`
	BookingDate     time.Time `json:"booking_date" db:"booking_date"`
}

type BookingStats struct {
	UserID         string  `json:"user_id" db:"user_id"`
	TotalBookings  int     `json:"total_bookings" db:"total_bookings"`
	TotalSpent     float64 `json:"total_spent" db:"total_spent"`
	LastBookingAt  time.Time `json:"last_booking_at" db:"last_booking_at"`
}

type HotelStats struct {
	HotelID       string  `json:"hotel_id" db:"hotel_id"`
	TotalBookings int     `json:"total_bookings" db:"total_bookings"`
	TotalRevenue  float64 `json:"total_revenue" db:"total_revenue"`
	LastBookingAt time.Time `json:"last_booking_at" db:"last_booking_at"`
}

type DailyStats struct {
	Date          time.Time `json:"date" db:"date"`
	TotalBookings int       `json:"total_bookings" db:"total_bookings"`
	TotalRevenue  float64   `json:"total_revenue" db:"total_revenue"`
	UniqueUsers   int       `json:"unique_users" db:"unique_users"`
	UniqueHotels  int       `json:"unique_hotels" db:"unique_hotels"`
}