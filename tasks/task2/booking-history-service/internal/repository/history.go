package repository

import (
	"database/sql"
	"fmt"
	"time"

	"booking-history-service/internal/models"

	_ "github.com/lib/pq"
)

type HistoryRepository struct {
	db *sql.DB
}

func NewHistoryRepository(db *sql.DB) *HistoryRepository {
	return &HistoryRepository{db: db}
}

func (r *HistoryRepository) SaveBookingHistory(event *models.BookingEvent) error {
	query := `
		INSERT INTO booking_history (
			booking_id, user_id, hotel_id, promo_code, 
			discount_percent, price, event_type, processed_at, booking_date
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	
	_, err := r.db.Exec(query,
		event.BookingID,
		event.UserID,
		event.HotelID,
		event.PromoCode,
		event.DiscountPercent,
		event.Price,
		event.EventType,
		time.Now(),
		event.CreatedAt,
	)
	
	return err
}

func (r *HistoryRepository) UpdateUserStats(event *models.BookingEvent) error {
	query := `
		INSERT INTO user_booking_stats (user_id, total_bookings, total_spent, last_booking_at)
		VALUES ($1, 1, $2, $3)
		ON CONFLICT (user_id)
		DO UPDATE SET
			total_bookings = user_booking_stats.total_bookings + 1,
			total_spent = user_booking_stats.total_spent + $2,
			last_booking_at = $3
	`
	
	_, err := r.db.Exec(query, event.UserID, event.Price, event.CreatedAt)
	return err
}

func (r *HistoryRepository) UpdateHotelStats(event *models.BookingEvent) error {
	query := `
		INSERT INTO hotel_booking_stats (hotel_id, total_bookings, total_revenue, last_booking_at)
		VALUES ($1, 1, $2, $3)
		ON CONFLICT (hotel_id)
		DO UPDATE SET
			total_bookings = hotel_booking_stats.total_bookings + 1,
			total_revenue = hotel_booking_stats.total_revenue + $2,
			last_booking_at = $3
	`
	
	_, err := r.db.Exec(query, event.HotelID, event.Price, event.CreatedAt)
	return err
}

func (r *HistoryRepository) UpdateDailyStats(event *models.BookingEvent) error {
	date := event.CreatedAt.Truncate(24 * time.Hour)
	
	// First, update daily stats
	query := `
		INSERT INTO daily_booking_stats (date, total_bookings, total_revenue, unique_users, unique_hotels)
		VALUES ($1, 1, $2, 1, 1)
		ON CONFLICT (date)
		DO UPDATE SET
			total_bookings = daily_booking_stats.total_bookings + 1,
			total_revenue = daily_booking_stats.total_revenue + $2
	`
	
	_, err := r.db.Exec(query, date, event.Price)
	if err != nil {
		return err
	}
	
	// Update unique users and hotels count for the day
	// This is a simplified approach - in production, you might use HyperLogLog or similar
	updateUniqueUsersQuery := `
		UPDATE daily_booking_stats
		SET unique_users = (
			SELECT COUNT(DISTINCT user_id)
			FROM booking_history
			WHERE DATE(booking_date) = $1
		)
		WHERE date = $1
	`
	
	updateUniqueHotelsQuery := `
		UPDATE daily_booking_stats
		SET unique_hotels = (
			SELECT COUNT(DISTINCT hotel_id)
			FROM booking_history
			WHERE DATE(booking_date) = $1
		)
		WHERE date = $1
	`
	
	if _, err := r.db.Exec(updateUniqueUsersQuery, date); err != nil {
		return err
	}
	
	if _, err := r.db.Exec(updateUniqueHotelsQuery, date); err != nil {
		return err
	}
	
	return nil
}

func (r *HistoryRepository) GetAllHistory() ([]*models.BookingHistory, error) {
	query := `
		SELECT id, booking_id, user_id, hotel_id, promo_code, 
		       discount_percent, price, event_type, processed_at, booking_date
		FROM booking_history
		ORDER BY processed_at DESC
	`
	
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var history []*models.BookingHistory
	for rows.Next() {
		h := &models.BookingHistory{}
		err := rows.Scan(
			&h.ID, &h.BookingID, &h.UserID, &h.HotelID, &h.PromoCode,
			&h.DiscountPercent, &h.Price, &h.EventType, &h.ProcessedAt, &h.BookingDate,
		)
		if err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	
	return history, nil
}

func (r *HistoryRepository) InitSchema() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS booking_history (
			id SERIAL PRIMARY KEY,
			booking_id VARCHAR(255) NOT NULL,
			user_id VARCHAR(255) NOT NULL,
			hotel_id VARCHAR(255) NOT NULL,
			promo_code VARCHAR(255),
			discount_percent DECIMAL(10,2) DEFAULT 0,
			price DECIMAL(10,2) NOT NULL,
			event_type VARCHAR(50) NOT NULL,
			processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			booking_date TIMESTAMP WITH TIME ZONE NOT NULL
		);`,
		
		`CREATE INDEX IF NOT EXISTS idx_booking_history_user_id ON booking_history(user_id);`,
		`CREATE INDEX IF NOT EXISTS idx_booking_history_hotel_id ON booking_history(hotel_id);`,
		`CREATE INDEX IF NOT EXISTS idx_booking_history_booking_date ON booking_history(booking_date);`,
		`CREATE INDEX IF NOT EXISTS idx_booking_history_processed_at ON booking_history(processed_at);`,
		
		`CREATE TABLE IF NOT EXISTS user_booking_stats (
			user_id VARCHAR(255) PRIMARY KEY,
			total_bookings INTEGER NOT NULL DEFAULT 0,
			total_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
			last_booking_at TIMESTAMP WITH TIME ZONE
		);`,
		
		`CREATE TABLE IF NOT EXISTS hotel_booking_stats (
			hotel_id VARCHAR(255) PRIMARY KEY,
			total_bookings INTEGER NOT NULL DEFAULT 0,
			total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
			last_booking_at TIMESTAMP WITH TIME ZONE
		);`,
		
		`CREATE TABLE IF NOT EXISTS daily_booking_stats (
			date DATE PRIMARY KEY,
			total_bookings INTEGER NOT NULL DEFAULT 0,
			total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
			unique_users INTEGER NOT NULL DEFAULT 0,
			unique_hotels INTEGER NOT NULL DEFAULT 0
		);`,
	}
	
	for _, query := range queries {
		if _, err := r.db.Exec(query); err != nil {
			return fmt.Errorf("failed to execute schema query: %w", err)
		}
	}
	
	return nil
}