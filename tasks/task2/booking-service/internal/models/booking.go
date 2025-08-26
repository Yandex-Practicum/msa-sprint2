package models

import (
	"time"
)

type Booking struct {
	ID              string    `json:"id" db:"id"`
	UserID          string    `json:"user_id" db:"user_id"`
	HotelID         string    `json:"hotel_id" db:"hotel_id"`
	PromoCode       string    `json:"promo_code" db:"promo_code"`
	DiscountPercent float64   `json:"discount_percent" db:"discount_percent"`
	Price           float64   `json:"price" db:"price"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

type User struct {
	ID          string `json:"id"`
	Active      bool   `json:"active"`
	Blacklisted bool   `json:"blacklisted"`
	Status      string `json:"status"`
}

type Hotel struct {
	ID           string  `json:"id"`
	Operational  bool    `json:"operational"`
	FullyBooked  bool    `json:"fullyBooked"`
	Name         string  `json:"name"`
	City         string  `json:"city"`
	Rating       float64 `json:"rating"`
}

type PromoCode struct {
	Code     string  `json:"code"`
	Discount float64 `json:"discountPercent"`
	Active   bool    `json:"active"`
	VipOnly  bool    `json:"vipOnly"`
}

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