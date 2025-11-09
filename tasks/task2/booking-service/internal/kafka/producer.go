package kafka

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	k "github.com/segmentio/kafka-go"
)

type Producer struct {
	Writer *k.Writer
	Topic  string
}

type BookingCreated struct {
	EventID    string `json:"eventId"`
	EventType  string `json:"eventType"`
	OccurredAt string `json:"occurredAt"`
	Source     string `json:"source"`
	Version    int    `json:"version"`
	Booking    any    `json:"booking"`
}

func (p Producer) PublishCreated(ctx context.Context, key string, booking any) error {
	evt := BookingCreated{
		EventID:    uuid.New().String(),
		EventType:  "BookingCreated",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
		Source:     "booking-service",
		Version:    1,
		Booking:    booking,
	}
	b, _ := json.Marshal(evt)
	msg := k.Message{
		Key:     []byte(key),
		Value:   b,
		Headers: []k.Header{{Key: "ce_type", Value: []byte("BookingCreated")}, {Key: "schemaVersion", Value: []byte("1")}},
	}
	return p.Writer.WriteMessages(ctx, msg)
}
