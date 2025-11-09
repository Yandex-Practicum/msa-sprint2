package db

import (
	"context"
	"database/sql"
	"time"
)

type Booking struct {
	ID        string
	UserID    string
	HotelID   string
	PromoCode string
	Discount  float64
	Price     float64
	Currency  string
	CreatedAt time.Time
}

type Repo struct{ DB *sql.DB }

func (r Repo) FindByIdempotency(ctx context.Context, key string) (*Booking, error) {
	row := r.DB.QueryRowContext(ctx, `SELECT id, user_id, hotel_id, promo_code, discount_percent, final_price, currency, created_at FROM bookings WHERE idempotency_key=$1`, key)
	var b Booking
	if err := row.Scan(&b.ID, &b.UserID, &b.HotelID, &b.PromoCode, &b.Discount, &b.Price, &b.Currency, &b.CreatedAt); err != nil {
		return nil, err
	}
	return &b, nil
}

func (r Repo) Insert(ctx context.Context, id, uid, hid, promo string, price, final, disc float64, curr, idemp string, created time.Time) error {
	_, err := r.DB.ExecContext(ctx, `INSERT INTO bookings(id, user_id, hotel_id, promo_code, price, currency, final_price, discount_percent, created_at, idempotency_key, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'CREATED')`, id, uid, hid, promo, price, curr, final, disc, created, idemp)
	return err
}

func (r Repo) ListByUser(ctx context.Context, user string) ([]Booking, error) {
	rows, err := r.DB.QueryContext(ctx, `SELECT id, user_id, hotel_id, promo_code, discount_percent, final_price, currency, created_at FROM bookings WHERE user_id=$1 ORDER BY created_at DESC`, user)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Booking
	for rows.Next() {
		var b Booking
		if err := rows.Scan(&b.ID, &b.UserID, &b.HotelID, &b.PromoCode, &b.Discount, &b.Price, &b.Currency, &b.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, nil
}
