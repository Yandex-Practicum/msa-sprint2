package repository

import (
	"database/sql"
	"fmt"
	"time"

	"booking-service/internal/models"

	_ "github.com/lib/pq"
)

type BookingRepository struct {
	db *sql.DB
}

func NewBookingRepository(db *sql.DB) *BookingRepository {
	return &BookingRepository{db: db}
}

func (r *BookingRepository) Create(booking *models.Booking) error {
	query := `
		INSERT INTO bookings (id, user_id, hotel_id, promo_code, discount_percent, price, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	
	booking.CreatedAt = time.Now()
	
	_, err := r.db.Exec(query,
		booking.ID,
		booking.UserID,
		booking.HotelID,
		booking.PromoCode,
		booking.DiscountPercent,
		booking.Price,
		booking.CreatedAt,
	)
	
	return err
}

func (r *BookingRepository) GetByUserID(userID string) ([]*models.Booking, error) {
	query := `
		SELECT id, user_id, hotel_id, promo_code, discount_percent, price, created_at
		FROM bookings
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var bookings []*models.Booking
	for rows.Next() {
		booking := &models.Booking{}
		err := rows.Scan(
			&booking.ID,
			&booking.UserID,
			&booking.HotelID,
			&booking.PromoCode,
			&booking.DiscountPercent,
			&booking.Price,
			&booking.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		bookings = append(bookings, booking)
	}
	
	return bookings, nil
}

func (r *BookingRepository) GetAll() ([]*models.Booking, error) {
	query := `
		SELECT id, user_id, hotel_id, promo_code, discount_percent, price, created_at
		FROM bookings
		ORDER BY created_at DESC
	`
	
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var bookings []*models.Booking
	for rows.Next() {
		booking := &models.Booking{}
		err := rows.Scan(
			&booking.ID,
			&booking.UserID,
			&booking.HotelID,
			&booking.PromoCode,
			&booking.DiscountPercent,
			&booking.Price,
			&booking.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		bookings = append(bookings, booking)
	}
	
	return bookings, nil
}

func (r *BookingRepository) InitSchema() error {
	query := `
		CREATE TABLE IF NOT EXISTS bookings (
			id VARCHAR(255) PRIMARY KEY,
			user_id VARCHAR(255) NOT NULL,
			hotel_id VARCHAR(255) NOT NULL,
			promo_code VARCHAR(255),
			discount_percent DECIMAL(10,2) DEFAULT 0,
			price DECIMAL(10,2) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
		
		CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
		CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);
	`
	
	_, err := r.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}
	
	return nil
}