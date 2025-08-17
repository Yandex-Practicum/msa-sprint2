package kafka

import (
	"context"
	"encoding/json"
	"log"
	"strconv"

	"github.com/IBM/sarama"

	"booking-service/server/models"
)

type Producer struct {
	p sarama.SyncProducer
}

func NewProducer(kafkaAddr string) Producer {
	config := sarama.NewConfig()
	config.Producer.Return.Successes = true          // Получать подтверждения
	config.Producer.RequiredAcks = sarama.WaitForAll // Гарантированная доставка
	config.Producer.Retry.Max = 5                    // Максимум 5 попыток

	p, err := sarama.NewSyncProducer([]string{kafkaAddr}, config)
	if err != nil {
		log.Fatalf("Ошибка создания продюсера: %v", err)
	}
	return Producer{p}
}

func (p Producer) SendBookingCreated(ctx context.Context, booking models.Booking) error {
	// Преобразуем в JSON
	msgValue, err := json.Marshal(booking)
	if err != nil {
		log.Fatalf("Ошибка преобразования в JSON: %v", err)
	}
	// 3. Отправляем сообщение
	_, _, err = p.p.SendMessage(&sarama.ProducerMessage{
		Topic: "booking",
		Key:   sarama.StringEncoder(strconv.FormatInt(booking.ID, 10)),
		Value: sarama.ByteEncoder(msgValue),
	})

	return err
}
