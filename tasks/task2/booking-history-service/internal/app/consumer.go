package app

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	k "github.com/segmentio/kafka-go"

	dbpkg "booking-history-service/internal/db"
	kread "booking-history-service/internal/kafka"
)

type Config struct {
	JDBCURL string
	DBUser  string
	DBPass  string
	Brokers string
	Topic   string
	Group   string
}

func Run(cfg Config) error {
	dsn := jdbcToPg(cfg.JDBCURL, cfg.DBUser, cfg.DBPass)
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return err
	}
	if err := db.Ping(); err != nil {
		return err
	}
	dbpkg.MustApplyMigrations(db)

	r := k.NewReader(k.ReaderConfig{Brokers: split(cfg.Brokers), Topic: cfg.Topic, GroupID: cfg.Group})
	defer r.Close()

	reader := kread.Reader{R: r}
	ctx := context.Background()
	log.Printf("consuming topic=%s group=%s", cfg.Topic, cfg.Group)

	return reader.Consume(ctx, handler{DB: db})
}

type handler struct{ DB *sql.DB }

func (h handler) Handle(offset int64, e kread.BookingEvent, raw []byte) error {
	when := kread.ParseDate(e.OccurredAt)
	date := when.Truncate(24 * time.Hour)

	_, _ = h.DB.Exec(`INSERT INTO booking_events(offset, event_id, booking_id, occurred_at, payload) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (event_id) DO NOTHING`, offset, e.EventID, e.Booking.ID, when, string(raw))

	_, _ = h.DB.Exec(`INSERT INTO daily_bookings(date, total_count, total_amount) VALUES ($1,1,$2) ON CONFLICT (date) DO UPDATE SET total_count = daily_bookings.total_count + 1, total_amount = daily_bookings.total_amount + EXCLUDED.total_amount`, date, e.Booking.FinalPrice)
	_, _ = h.DB.Exec(`INSERT INTO user_bookings(user_id, total_count, total_amount) VALUES ($1,1,$2) ON CONFLICT (user_id) DO UPDATE SET total_count = user_bookings.total_count + 1, total_amount = user_bookings.total_amount + EXCLUDED.total_amount`, e.Booking.UserID, e.Booking.FinalPrice)
	_, _ = h.DB.Exec(`INSERT INTO hotel_bookings(hotel_id, total_count, total_amount) VALUES ($1,1,$2) ON CONFLICT (hotel_id) DO UPDATE SET total_count = hotel_bookings.total_count + 1, total_amount = hotel_bookings.total_amount + EXCLUDED.total_amount`, e.Booking.HotelID, e.Booking.FinalPrice)
	return nil
}

func split(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
func jdbcToPg(jdbc, user, pass string) string {
	j := strings.TrimPrefix(jdbc, "jdbc:")
	if strings.HasPrefix(j, "postgres://") || strings.HasPrefix(j, "postgresql://") {
		j = "postgres://" + strings.TrimPrefix(strings.TrimPrefix(j, "postgres://"), "postgresql://")
		if !strings.Contains(j, "sslmode=") {
			if strings.Contains(j, "?") {
				j += "&sslmode=disable"
			} else {
				j += "?sslmode=disable"
			}
		}
		return j
	}
	host := strings.TrimPrefix(j, "postgresql://")
	host = strings.TrimPrefix(host, "postgres://")
	return fmt.Sprintf("postgres://%s:%s@%s?sslmode=disable", user, pass, host)
}
