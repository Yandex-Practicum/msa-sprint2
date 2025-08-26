package consumer

import (
	"context"
	"encoding/json"
	"log"

	"booking-history-service/internal/models"
	"booking-history-service/internal/repository"

	"github.com/Shopify/sarama"
)

type BookingConsumer struct {
	consumer sarama.ConsumerGroup
	repo     *repository.HistoryRepository
	topic    string
}

func NewBookingConsumer(brokers []string, groupID, topic string, repo *repository.HistoryRepository) (*BookingConsumer, error) {
	config := sarama.NewConfig()
	config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin
	config.Consumer.Offsets.Initial = sarama.OffsetOldest

	consumer, err := sarama.NewConsumerGroup(brokers, groupID, config)
	if err != nil {
		return nil, err
	}

	return &BookingConsumer{
		consumer: consumer,
		repo:     repo,
		topic:    topic,
	}, nil
}

func (c *BookingConsumer) Start(ctx context.Context) error {
	handler := &ConsumerGroupHandler{repo: c.repo}

	for {
		select {
		case <-ctx.Done():
			log.Println("Consumer context cancelled, stopping...")
			return nil
		default:
			if err := c.consumer.Consume(ctx, []string{c.topic}, handler); err != nil {
				log.Printf("Error from consumer: %v", err)
				return err
			}
		}
	}
}

func (c *BookingConsumer) Close() error {
	return c.consumer.Close()
}

type ConsumerGroupHandler struct {
	repo *repository.HistoryRepository
}

func (h *ConsumerGroupHandler) Setup(sarama.ConsumerGroupSession) error {
	log.Println("Consumer group session setup")
	return nil
}

func (h *ConsumerGroupHandler) Cleanup(sarama.ConsumerGroupSession) error {
	log.Println("Consumer group session cleanup")
	return nil
}

func (h *ConsumerGroupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for message := range claim.Messages() {
		log.Printf("Received message: topic=%s partition=%d offset=%d", 
			message.Topic, message.Partition, message.Offset)

		var event models.BookingEvent
		if err := json.Unmarshal(message.Value, &event); err != nil {
			log.Printf("Failed to unmarshal message: %v", err)
			// Mark message as processed even if we can't parse it to avoid stuck offset
			session.MarkMessage(message, "")
			continue
		}

		if err := h.processBookingEvent(&event); err != nil {
			log.Printf("Failed to process booking event: %v", err)
			// In production, you might want to implement retry logic or dead letter queue
		}

		// Mark message as processed
		session.MarkMessage(message, "")
	}

	return nil
}

func (h *ConsumerGroupHandler) processBookingEvent(event *models.BookingEvent) error {
	log.Printf("Processing booking event: %s for user %s and hotel %s", 
		event.EventType, event.UserID, event.HotelID)

	// Save to booking history
	if err := h.repo.SaveBookingHistory(event); err != nil {
		return err
	}

	// Update user stats
	if err := h.repo.UpdateUserStats(event); err != nil {
		log.Printf("Failed to update user stats: %v", err)
	}

	// Update hotel stats
	if err := h.repo.UpdateHotelStats(event); err != nil {
		log.Printf("Failed to update hotel stats: %v", err)
	}

	// Update daily stats
	if err := h.repo.UpdateDailyStats(event); err != nil {
		log.Printf("Failed to update daily stats: %v", err)
	}

	log.Printf("Successfully processed booking event: %s", event.BookingID)
	return nil
}