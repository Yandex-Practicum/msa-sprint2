package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/practikum/booking_mikro/internal/domain/model"
	"github.com/practikum/booking_mikro/internal/storage"
)

var (
	insertBooking = `INSERT INTO booking(user_id,hotel_id,promo_code,discount_percent,price,created_at)
					VALUES($1,$2,$3,$4,$5,$6)returning id;`
	getAllBookings = `SELECT id,user_id,hotel_id,promo_code,discount_percent,price,created_at 
						FROM booking;`
	getUserBookings = `SELECT id,user_id,hotel_id,promo_code,discount_percent,price,created_at
						FROM booking WHERE user_id = $1;`
)

type Storage struct {
	db *sql.DB
}

func New(db *sql.DB) *Storage {
	return &Storage{db: db}
}

func (s *Storage) SaveBooking(ctx context.Context, booking model.Booking) (int64, error) {
	row := s.db.QueryRowContext(ctx,
		insertBooking,
		booking.UserId, booking.HotelId,
		booking.PromoCode,
		booking.DiscountPercent,
		booking.Price,
		booking.CreatedAt)

	var id int64

	err := row.Scan(&id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			if pgErr.Code == `23505` {
				return 0, fmt.Errorf("SaveBooking.row.Scan: %w", storage.ErrBookingExists)
			}

			return 0, fmt.Errorf("SaveBooking.row.Scan: %w", err)
		}
	}
	return id, nil
}

func (s *Storage) GetAllBookings(ctx context.Context) ([]model.Booking, error) {
	rows, err := s.db.QueryContext(ctx, getAllBookings)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []model.Booking{}, fmt.Errorf("GetAllBookings.db.QueryContext: %w", storage.ErrDataNotFound)
		}
		return []model.Booking{}, fmt.Errorf("GetAllBookings.db.QueryContext: %w", err)
	}
	defer rows.Close()

	var bookings = []model.Booking{}

	for rows.Next() {
		var b model.Booking
		if err := rows.Scan(&b.Id, &b.UserId, &b.PromoCode, &b.DiscountPercent, b.Price, b.CreatedAt); err != nil {
			return bookings, fmt.Errorf("GetAllBookings.rows.Scan: %w", err)
		}
		bookings = append(bookings, b)
	}
	return bookings, nil
}

func (s *Storage) GetUserBookings(ctx context.Context, userId string) ([]model.Booking, error) {
	rows, err := s.db.QueryContext(ctx, getUserBookings, userId)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return []model.Booking{}, fmt.Errorf("GetUserBookings.db.QueryContext: %w", storage.ErrDataNotFound)
		}
		return []model.Booking{}, fmt.Errorf("GetUserBookings.db.QueryContext: %w", err)
	}
	defer rows.Close()

	var bookings = []model.Booking{}

	for rows.Next() {
		var b model.Booking
		if err := rows.Scan(&b.Id, &b.UserId, &b.HotelId, &b.PromoCode, &b.DiscountPercent, &b.Price, &b.CreatedAt); err != nil {
			return bookings, fmt.Errorf("GetUserBookings.rows.Scan: %w", err)
		}
		bookings = append(bookings, b)
	}
	return bookings, nil
}
