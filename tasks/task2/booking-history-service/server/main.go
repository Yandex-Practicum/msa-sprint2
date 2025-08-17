package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"

	"github.com/IBM/sarama"

	"booking-history-service/models"
)

type Consumer struct {
	ready chan bool
}

func (consumer *Consumer) Setup(sarama.ConsumerGroupSession) error {
	close(consumer.ready)
	return nil
}

func (consumer *Consumer) Cleanup(sarama.ConsumerGroupSession) error {
	return nil
}

func (consumer *Consumer) ConsumeClaim(
	session sarama.ConsumerGroupSession,
	claim sarama.ConsumerGroupClaim,
) error {
	for msg := range claim.Messages() {
		var booking models.Booking
		if err := json.Unmarshal(msg.Value, &booking); err != nil {
			log.Printf("Ошибка декодирования: %v\n", err)
			continue
		}
		log.Printf("Сообщение получено: %+v (topic: %s, partition: %d, offset: %d)\n",
			booking, msg.Topic, msg.Partition, msg.Offset)
		session.MarkMessage(msg, "")
	}
	return nil
}

func main() {
	config := sarama.NewConfig()
	config.Version = sarama.V2_8_0_0
	config.Consumer.Offsets.Initial = sarama.OffsetOldest

	consumer := Consumer{
		ready: make(chan bool),
	}

	ctx, cancel := context.WithCancel(context.Background())
	client, err := sarama.NewConsumerGroup([]string{os.Getenv("KAFKA_BROKER")}, "booking-history-group", config)
	if err != nil {
		log.Fatalf("Ошибка создания consumer group: %v", err)
	}

	wg := &sync.WaitGroup{}
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			if err := client.Consume(ctx, []string{"booking"}, &consumer); err != nil {
				log.Fatalf("Ошибка в consumer: %v", err)
			}
			if ctx.Err() != nil {
				return
			}
			consumer.ready = make(chan bool)
		}
	}()

	<-consumer.ready
	log.Println("Consumer готов к работе")

	sigterm := make(chan os.Signal, 1)
	signal.Notify(sigterm, syscall.SIGINT, syscall.SIGTERM)
	<-sigterm
	cancel()
	wg.Wait()

	if err = client.Close(); err != nil {
		log.Fatalf("Ошибка при закрытии клиента: %v", err)
	}
}
