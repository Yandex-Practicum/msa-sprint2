package com.hotelio.booking.configuration;

import org.apache.kafka.clients.CommonClientConfigs;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "kafka")
public class KafkaProperties {

    private String consumerGroupId;

    private int consumerConcurrency;

    private int consumerPrefetch;

    private String bootstrapServers;

    private Topic bookingTopic;

    public KafkaProperties() {
    }

    @SuppressWarnings("MagicNumber")
    public Map<String, Object> fetchConsumerProps() {
        Map<String, Object> props = new HashMap<>();
        props.put(CommonClientConfigs.BOOTSTRAP_SERVERS_CONFIG, this.getBootstrapServers());

        props.put(ConsumerConfig.GROUP_ID_CONFIG, this.consumerGroupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "false");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        return props;
    }

    @SuppressWarnings("MagicNumber")
    public Map<String, Object> fetchProducerProps() {
        Map<String, Object> props = new HashMap<>();
        props.put(CommonClientConfigs.BOOTSTRAP_SERVERS_CONFIG, this.getBootstrapServers());

        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);

        /*
        Purpose : Specifies the time (in milliseconds) the producer waits before sending a batch.
        Effect : Increases batching by delaying sends, improving throughput at the cost of latency.
         */
        props.put(ProducerConfig.LINGER_MS_CONFIG, 5); // Wait up to 5 ms (default is 0)

        /*
        Purpose : Specifies the maximum size (in bytes) of a batch of messages sent to Kafka.
        Effect : Larger batches reduce the number of network requests, improving throughput.
         */
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 32768); // 32 KB (default is 16384 - 16 KB)

        /*
        The acks configuration determines when a producer considers a write successful.
                acks=0 : The producer does not wait for any acknowledgment from the broker.
                acks=1 : The producer waits for the leader to acknowledge the write.
                acks=all : The producer waits for all in-sync replicas (ISRs) to acknowledge the write.
                Drawbacks of acks=all:
                    Increased latency due to waiting for all replicas to acknowledge.
                    Potential throughput reduction if replicas are slow or unavailable.
                Use acks=all when message durability is critical (e.g., financial transactions). For less critical, consider acks=1.
         */
        props.put(ProducerConfig.ACKS_CONFIG, "all"); // Ensure message durability

        /*
        Prevent duplicates from retries
        sets acks=all
        */
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, "false");
        return props;
    }

    public String getConsumerGroupId() {
        return consumerGroupId;
    }

    public int getConsumerConcurrency() {
        return consumerConcurrency;
    }

    public int getConsumerPrefetch() {
        return consumerPrefetch;
    }

    public String getBootstrapServers() {
        return bootstrapServers;
    }

    public Topic getBookingTopic() {
        return bookingTopic;
    }

    public void setConsumerGroupId(String consumerGroupId) {
        this.consumerGroupId = consumerGroupId;
    }

    public void setConsumerConcurrency(int consumerConcurrency) {
        this.consumerConcurrency = consumerConcurrency;
    }

    public void setConsumerPrefetch(int consumerPrefetch) {
        this.consumerPrefetch = consumerPrefetch;
    }

    public void setBootstrapServers(String bootstrapServers) {
        this.bootstrapServers = bootstrapServers;
    }

    public void setBookingTopic(Topic bookingTopic) {
        this.bookingTopic = bookingTopic;
    }

    public static final class Topic {

        private final String name;

        private final Integer numPartitions;

        private final Short replicationFactor;

        public Topic(String name, Integer numPartitions, Short replicationFactor) {
            this.name = name;
            this.numPartitions = numPartitions;
            this.replicationFactor = replicationFactor;
        }

        public String getName() {
            return name;
        }

        public Integer getNumPartitions() {
            return numPartitions;
        }

        public Short getReplicationFactor() {
            return replicationFactor;
        }
    }
}
