package com.example.dahaeng.global.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableRabbit
public class RabbitMQConfig {
    // Exchange names
    public static final String FLIGHT_ALERT_EXCHANGE = "flight-alert-exchange";

    // Queue names
    public static final String FLIGHT_ALERT_EVAL_QUEUE = "flight-alert-eval";
    public static final String FLIGHT_ALERT_EMAIL_QUEUE = "flight-alert-email";
    public static final String FLIGHT_ALERT_EVAL_DLQ = "flight-alert-eval-dlq";
    public static final String FLIGHT_ALERT_EMAIL_DLQ = "flight-alert-email-dlq";

    // Routing keys
    public static final String FLIGHT_ALERT_EVAL_ROUTING_KEY = "flight.alert.eval";
    public static final String FLIGHT_ALERT_EMAIL_ROUTING_KEY = "flight.alert.email";

    // =============== Main Queues ===============
    @Bean
    public Queue flightAlertEvalQueue() {
        return new Queue(FLIGHT_ALERT_EVAL_QUEUE, true, false, false, arguments());
    }

    @Bean
    public Queue flightAlertEmailQueue() {
        return new Queue(FLIGHT_ALERT_EMAIL_QUEUE, true, false, false, arguments());
    }

    // =============== Dead Letter Queues ===============
    @Bean
    public Queue flightAlertEvalDLQ() {
        return new Queue(FLIGHT_ALERT_EVAL_DLQ, true);
    }

    @Bean
    public Queue flightAlertEmailDLQ() {
        return new Queue(FLIGHT_ALERT_EMAIL_DLQ, true);
    }

    // =============== Exchange ===============
    @Bean
    public DirectExchange flightAlertExchange() {
        return new DirectExchange(FLIGHT_ALERT_EXCHANGE, true, false);
    }

    // =============== Bindings ===============
    @Bean
    public Binding flightAlertEvalBinding(Queue flightAlertEvalQueue, DirectExchange flightAlertExchange) {
        return BindingBuilder.bind(flightAlertEvalQueue)
            .to(flightAlertExchange)
            .with(FLIGHT_ALERT_EVAL_ROUTING_KEY);
    }

    @Bean
    public Binding flightAlertEmailBinding(Queue flightAlertEmailQueue, DirectExchange flightAlertExchange) {
        return BindingBuilder.bind(flightAlertEmailQueue)
            .to(flightAlertExchange)
            .with(FLIGHT_ALERT_EMAIL_ROUTING_KEY);
    }

    // =============== Message Converter ===============
    @Bean
    public MessageConverter jackson2MessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    // =============== Queue Arguments (DLQ Configuration) ===============
    private java.util.Map<String, Object> arguments() {
        java.util.Map<String, Object> args = new java.util.HashMap<>();
        args.put("x-dead-letter-exchange", FLIGHT_ALERT_EXCHANGE);
        args.put("x-dead-letter-routing-key", "flight.alert.dlq");
        args.put("x-max-length", 100000); // 최대 메시지 수 제한
        return args;
    }
}
