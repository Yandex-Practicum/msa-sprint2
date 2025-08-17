package models

import (
	"time"
)

type Booking struct {
	ID              int64     `db:"id" json:"id,omitempty"`
	UserID          string    `db:"user_id" json:"user_id,omitempty"`
	HotelID         string    `db:"hotel_id" json:"hotel_id,omitempty"`
	PromoCode       *string   `db:"promo_code" json:"promo_code,omitempty"`
	DiscountPercent *float64  `db:"discount_percent" json:"discount_percent,omitempty"`
	Price           float64   `db:"price" json:"price,omitempty"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}
