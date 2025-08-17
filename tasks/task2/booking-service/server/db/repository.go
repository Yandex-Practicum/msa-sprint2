package db

import (
	"context"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
)

type Repo struct {
	db *sqlx.DB
}

type Booking struct {
	ID              int64     `db:"id"`
	UserID          string    `db:"user_id"`
	HotelID         string    `db:"hotel_id"`
	PromoCode       *string   `db:"promo_code"`
	DiscountPercent *float64  `db:"discount_percent"`
	Price           float64   `db:"price"`
	CreatedAt       time.Time `db:"created_at"`
}

func (r Repo) Save(ctx context.Context, booking Booking) (Booking, error) {
	const query = `
        INSERT INTO booking (
            user_id,
            hotel_id,
            promo_code,
            discount_percent,
            price,
            created_at
        ) VALUES (
            :user_id,
            :hotel_id,
            :promo_code,
            :discount_percent,
            :price,
            :created_at
        )
        RETURNING id
    `

	rows, err := r.db.NamedQueryContext(ctx, query, booking)
	if err != nil {
		return Booking{}, fmt.Errorf("failed to save booking: %w", err)
	}
	defer rows.Close()

	if rows.Next() {
		if err = rows.Scan(&booking.ID); err != nil {
			return Booking{}, fmt.Errorf("failed to scan returned id: %w", err)
		}
	}

	return booking, rows.Err()
}

func (r Repo) ListAll(ctx context.Context, userID string) ([]Booking, error) {
	var query = `
        SELECT 
            id,
            user_id,
            hotel_id,
            promo_code,
            discount_percent,
            price,
            created_at
        FROM booking
        `

	var bookings []Booking
	var args []interface{}
	if userID != "" {
		query = query + " WHERE user_id = $1"
		args = append(args, userID)
	}
	err := r.db.SelectContext(ctx, &bookings, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list bookings: %w", err)
	}

	return bookings, nil
}
