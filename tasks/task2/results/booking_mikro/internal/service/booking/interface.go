package booking

import (
	"context"

	"github.com/practikum/booking_mikro/internal/domain/model"
)

type BookingeStore interface {
	SaveBooking(ctx context.Context, booking model.Booking) (int64, error)
	GetAllBookings(ctx context.Context) ([]model.Booking, error)
	GetUserBookings(ctx context.Context, userId string) ([]model.Booking, error)
}

type UserStore interface {
	IsUserActive(userId string) bool
	IsUserBlacklisted(userId string) bool
	GetUserStatus(userId string) (string, error)
}
type HotelStore interface {
	IsHotelOperational(hotelId string) bool
	IsHotelFullyBooked(hotelId string) bool
}

type PromocodeStore interface {
	Validate(promoCode, userId string) (float64, error)
}

type ReviewStore interface {
	IsTrustedHotel(hotelId string) bool
}
