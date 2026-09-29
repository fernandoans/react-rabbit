package com.example.reactrabbit.controller;

import com.example.reactrabbit.config.RabbitMQConfig;
import com.example.reactrabbit.dto.NodeExecutionMessage;
import com.example.reactrabbit.dto.WorkflowDTO;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workflows")
public class WorkflowController {

    private final RabbitTemplate rabbitTemplate;

    public WorkflowController(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @PostMapping("/execute")
    public ResponseEntity<String> executeWorkflow(@RequestBody WorkflowDTO workflow) {
        System.out.println("Recebido Workflow: " + workflow.workflowId());

        // Encontra o nó inicial (trigger)
        var startNode = workflow.nodes().stream()
                .filter(n -> "trigger".equals(n.type()))
                .findFirst()
                .orElse(null);

        if (startNode != null) {
            // Dispara a execução a partir do nó inicial
            triggerNextNodes(startNode.id(), workflow);
        }

        return ResponseEntity.ok("Workflow " + workflow.workflowId() + " recebido e em processamento!");
    }

    public void triggerNextNodes(String currentNodeId, WorkflowDTO workflow) {
        // Encontra conexões de saída a partir do nó atual
        workflow.edges().stream()
        .filter(edge -> edge.source().equals(currentNodeId))
        .forEach(edge -> {
            var nextNode = workflow.nodes().stream()
                    .filter(n -> n.id().equals(edge.target()))
                    .findFirst()
                    .orElse(null);

            if (nextNode != null) {
                NodeExecutionMessage message = new NodeExecutionMessage(
                        workflow.workflowId(),
                        nextNode.id(),
                        workflow
                );

                String routingKey = "node." + nextNode.type();
                System.out.println("Publicando no RabbitMQ -> Routing Key: " + routingKey);

                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.WORKFLOW_EXCHANGE,
                        routingKey,
                        message
                );
            }
        });
    }
}