package com.example.reactrabbit.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String WORKFLOW_EXCHANGE = "workflow.exchange";
    public static final String EMAIL_QUEUE = "workflow.node.email.queue";
    public static final String SLACK_QUEUE = "workflow.node.slack.queue";

    @Bean
    public TopicExchange workflowExchange() {
        return new TopicExchange(WORKFLOW_EXCHANGE);
    }

    @Bean
    public Queue emailQueue() {
        return new Queue(EMAIL_QUEUE, true);
    }

    @Bean
    public Queue slackQueue() {
        return new Queue(SLACK_QUEUE, true);
    }

    @Bean
    public Binding emailBinding(Queue emailQueue, TopicExchange workflowExchange) {
        return BindingBuilder.bind(emailQueue).to(workflowExchange).with("node.email");
    }

    @Bean
    public Binding slackBinding(Queue slackQueue, TopicExchange workflowExchange) {
        return BindingBuilder.bind(slackQueue).to(workflowExchange).with("node.slack");
    }

    // Usando o novo conversor atualizado
    @Bean
    public JacksonJsonMessageConverter messageConverter() {
        return new JacksonJsonMessageConverter();
    }
}