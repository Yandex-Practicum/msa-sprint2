package model

import "time"

type Booking struct {
	Id              int64
	UserId          string
	HotelId         string
	Promocode       string
	DiscountPercent float64
	Price           float64
	CreatedAt       time.Time
}
