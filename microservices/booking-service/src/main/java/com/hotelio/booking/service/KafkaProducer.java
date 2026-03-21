package com.hotelio.booking.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaProducer {

    private final ObjectMapper objectMapper;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public KafkaProducer(ObjectMapper objectMapper, KafkaTemplate<String, String> kafkaTemplate) {
        this.objectMapper = objectMapper;
        this.kafkaTemplate = kafkaTemplate;
    }

    public void send(String topic, String key, Object data) {
        try {
            kafkaTemplate.send(topic, key, objectMapper.writeValueAsString(data));
            System.out.println("Сообщение отправлено в Kafka topic");
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }
}
