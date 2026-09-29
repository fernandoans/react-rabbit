package com.example.reactrabbit.worker;

import com.example.reactrabbit.config.RabbitMQConfig;
import com.example.reactrabbit.controller.WorkflowController;
import com.example.reactrabbit.dto.NodeExecutionMessage;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class NodeWorkers {

    private final WorkflowController workflowController;

    public NodeWorkers(WorkflowController workflowController) {
        this.workflowController = workflowController;
    }

    @RabbitListener(queues = RabbitMQConfig.EMAIL_QUEUE)
    public void processEmailNode(NodeExecutionMessage message) {
        System.out.println("📧 [WORKER EMAIL] Processando nó: " + message.currentNodeId());

        // Simula o tempo de processamento de um envio de e-mail
        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        System.out.println("📧 [WORKER EMAIL] E-mail enviado com sucesso!");

        // Avança para o próximo nó do grafo
        workflowController.triggerNextNodes(message.currentNodeId(), message.fullWorkflow());
    }

    @RabbitListener(queues = RabbitMQConfig.SLACK_QUEUE)
    public void processSlackNode(NodeExecutionMessage message) {
        System.out.println("💬 [WORKER SLACK] Processando nó: " + message.currentNodeId());

        try {
            Thread.sleep(1500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        System.out.println("💬 [WORKER SLACK] Notificação enviada ao Slack!");

        // Avança para o próximo nó do grafo
        workflowController.triggerNextNodes(message.currentNodeId(), message.fullWorkflow());
    }
}