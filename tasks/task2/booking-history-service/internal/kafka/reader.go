package kafka

import (
	"context"
	"encoding/json"
	"time"

	k "github.com/segmentio/kafka-go"
)

type BookingEvent struct {
	EventID    string `json:"eventId"`
	EventType  string `json:"eventType"`
	OccurredAt string `json:"occurredAt"`
	Booking    struct {
		ID         string  `json:"id"`
		UserID     string  `json:"userId"`
		HotelID    string  `json:"hotelId"`
		FinalPrice float64 `json:"finalPrice"`
	} `json:"booking"`
}

type Handler interface {
	Handle(offset int64, evt BookingEvent, raw []byte) error
}

type Reader struct{ R *k.Reader }

func (r Reader) Consume(ctx context.Context, h Handler) error {
	for {
		m, err := r.R.ReadMessage(ctx)
		if err != nil {
			return err
		}
		var e BookingEvent
		if err := json.Unmarshal(m.Value, &e); err != nil {
			continue
		}
		if e.EventType != "BookingCreated" {
			continue
		}
		if err := h.Handle(m.Offset, e, m.Value); err != nil {
			return err
		}
	}
}

func ParseDate(s string) time.Time { t, _ := time.Parse(time.RFC3339, s); return t.UTC() }
