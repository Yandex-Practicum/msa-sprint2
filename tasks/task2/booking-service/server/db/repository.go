package db

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"

	"booking-service/server/models"
)

type Repo struct {
	Db *sqlx.DB
}

func NewRepo(db *sqlx.DB) Repo {
	return Repo{Db: db}
}

func (r Repo) Save(ctx context.Context, booking models.Booking) (models.Booking, error) {
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

	rows, err := r.Db.NamedQueryContext(ctx, query, booking)
	if err != nil {
		return models.Booking{}, fmt.Errorf("failed to save booking: %w", err)
	}
	defer rows.Close()

	if rows.Next() {
		if err = rows.Scan(&booking.ID); err != nil {
			return models.Booking{}, fmt.Errorf("failed to scan returned id: %w", err)
		}
	}

	return booking, rows.Err()
}

func (r Repo) ListAll(ctx context.Context, userID string) ([]models.Booking, error) {
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

	var bookings []models.Booking
	var args []interface{}
	if userID != "" {
		query = query + " WHERE user_id = $1"
		args = append(args, userID)
	}
	err := r.Db.SelectContext(ctx, &bookings, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list bookings: %w", err)
	}

	return bookings, nil
}
