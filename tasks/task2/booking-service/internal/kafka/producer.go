package kafka

import (
	"encoding/json"
	"log"

	"booking-service/internal/models"

	"github.com/Shopify/sarama"
)

type Producer struct {
	producer sarama.SyncProducer
	topic    string
}

func NewProducer(brokers []string, topic string) (*Producer, error) {
	config := sarama.NewConfig()
	config.Producer.RequiredAcks = sarama.WaitForAll
	config.Producer.Retry.Max = 5
	config.Producer.Return.Successes = true

	producer, err := sarama.NewSyncProducer(brokers, config)
	if err != nil {
		return nil, err
	}

	return &Producer{
		producer: producer,
		topic:    topic,
	}, nil
}

func (p *Producer) PublishBookingCreated(booking *models.Booking) error {
	event := &models.BookingEvent{
		BookingID:       booking.ID,
		UserID:          booking.UserID,
		HotelID:         booking.HotelID,
		PromoCode:       booking.PromoCode,
		DiscountPercent: booking.DiscountPercent,
		Price:           booking.Price,
		CreatedAt:       booking.CreatedAt,
		EventType:       "BOOKING_CREATED",
	}

	messageBytes, err := json.Marshal(event)
	if err != nil {
		return err
	}

	msg := &sarama.ProducerMessage{
		Topic: p.topic,
		Key:   sarama.StringEncoder(booking.ID),
		Value: sarama.ByteEncoder(messageBytes),
	}

	partition, offset, err := p.producer.SendMessage(msg)
	if err != nil {
		log.Printf("Failed to send message to Kafka: %v", err)
		return err
	}

	log.Printf("Message sent to partition %d at offset %d", partition, offset)
	return nil
}

func (p *Producer) Close() error {
	return p.producer.Close()
}