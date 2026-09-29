# React Flow + RabbitMQ + Spring Boot 4

Unir o React Flow (no frontend) com Spring Boot e RabbitMQ (no backend) é uma arquitetura excelente para criar motores de fluxo de trabalho (Workflow Engines), builders de automação (no estilo Zapier/n8n) ou orquestradores de pipelines visual.

## 🏗️ Arquitetura

Aqui está como essa arquitetura se conecta no mundo real, como projetar a solução e um guia completo de implementação.

```
┌─────────────────┐     HTTP (POST JSON)      ┌────────────────────────┐
│   React Flow    │ ────────────────────────> │   Spring Boot API      │
│  (Frontend UI)  │                           │   (Graph Interpreter)  │
└─────────────────┘                           └───────────┬────────────┘
                                                          │
                                                  Publica Mensagem
                                                          │
                                                          v
                                              ┌────────────────────────┐
                                              │   RabbitMQ Exchanges   │
                                              │   & Queues (Queues)    │
                                              └───────────┬────────────┘
                                                          │
                                               Consome e Executa Nó
                                                          │
                                                          v
                                              ┌────────────────────────┐
                                              │  Spring Boot Workers / │
                                              │   Executores de Nós    │
                                              └────────────────────────┘
```

- Frontend (React Flow): O usuário desenha o fluxo na tela conectando nós (Nodes e Edges).
- Spring Boot (Interpretador): Recebe a estrutura do gráfico (JSON do React Flow), valida a topologia do fluxo, persiste a definição do fluxo e inicia a execução enviando o nó inicial para o RabbitMQ.
- RabbitMQ (Mensageria): Garante a execução assíncrona, desacoplada e escalável de cada etapa do fluxo. Se um nó demorar ou falhar, a fila gerencia retentativas sem bloquear o sistema.
- Spring Boot Workers (Executores): Escutam as filas correspondentes ao tipo de cada nó (ex: node.email, node.http-request, node.delay), executam a lógica específica daquele nó e publicam o próximo nó da cadeia no RabbitMQ.

### 🌟 Funcionalidades Implementadas

1. Canvas com Estilo React Flow:
    - Nós Personalizados: Gatilhos (Trigger), E-mail, Notificação Slack, Webhook HTTP e Delays.
    - Conectores (Handles): Arraste dos pontos das bordas para criar conexões (Edges) em curva Bezier.
    - Interatividade de Arraste: Mova os nós livremente na grade do canvas.
2. Simulador de Integração Spring Boot & RabbitMQ:
    - Botão "Executar Workflow" que monta a payload do Grafo JSON e envia para a API REST simulada.
    - Animações em Tempo Real: Conforme as mensagens transitam pelas filas do RabbitMQ, os nós mudam de estado (Na Fila, Executando, Sucesso/200 OK).
    - Dashboard de Filas: Exibe o número de mensagens pendentes em cada fila do RabbitMQ.
3. Painel de Painéis e Logs:
    - Payloads JSON: Visualize em tempo real o formato exato dos dados que o React Flow envia para o controlador Spring Boot.
    - Console de Logs: Registra eventos simulados de WebSockets (NODE_STARTED, RABBITMQ_MESSAGE_QUEUED, NODE_COMPLETED).

## 🎯 Caso de Uso Prático: Automação de Marketing / Workflows

Pensemos em um fluxo onde o usuário desenha no React Flow: Gatilho: Novo Usuário Cadastrado $\rightarrow$ Ação 1: Enviar E-mail de Boas-Vindas $\rightarrow$ Ação 2: Esperar 1 Dia $\rightarrow$ Ação 3: Notificar no Slack.

### 💻 Implementação Passo a Passo

1. Modelo de Dados JSON (Do React Flow para o Spring Boot)O React Flow exporta por padrão uma estrutura JSON contendo nodes e edges:

```json
{
  "workflowId": "wf-12345",
  "nodes": [
    { "id": "node-1", "type": "trigger", "data": { "action": "user_signup" } },
    { "id": "node-2", "type": "email", "data": { "to": "user@email.com", "template": "welcome" } },
    { "id": "node-3", "type": "slack", "data": { "channel": "#growth", "message": "Novo usuário!" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "node-1", "target": "node-2" },
    { "id": "e2-3", "source": "node-2", "target": "node-3" }
  ]
}
```

2. No Spring Boot — Modelos DTOs - Classes criadas para desserializar a estrutura do gráfico enviada pelo React Flow.

3. Configuração do RabbitMQ no Spring Boot - infraestrutura básica de mensageria com uma Topic Exchange.

4. Controlador REST e Orquestrador: O controlador recebe o fluxo enviado pelo frontend React Flow e dispara o primeiro nó.

5. Workers Consumidores dos Nós: Cada nó é processado de forma assíncrona. Após concluir a execução, ele chama a transição para o próximo nó do React Flow.


### ⚡ Práticas Essenciais para esse Projeto

- Gerenciamento de Estado: Salvar o estado da execução de cada nó em um banco de dados (ex: PostgreSQL) com os status: PENDING, RUNNING, SUCCESS, FAILED.
- Atualizações em Tempo Real na UI: Use WebSockets (Spring WebSocket + STOMP) para notificar o React Flow em tempo real conforme os nós forem sendo processados (mudando a cor do nó na tela para verde/vermelho).
- Nós Condicionais (If/Else): Suporte nós de decisão avaliando expressões condicionais antes de decidir qual edge seguir no gráfico.

# React Rabbit

Integração back para os fluxos de trabalho.

## Instalação do RabbitMQ

```
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```
- Porta 5672 é de comunicação do Spring Boot com o RabbitMQ (protocolo AMQP).
- Porta 15672 é do painel visual de gerenciamento no navegador em http://localhost:15672 (Usuário: guest / Senha: guest).

Inicie o backend.

## Instalação e Início do front

Na primeira vez baixe as bibliotecas; Execute o servidor de desenvolvimento do Vite:

```
npm install
npm run dev
```

## 🧪 Testando a Integração

Certifique-se de que o RabbitMQ está rodando no Docker.

1. Iniciar a aplicação Spring Boot (./mvnw spring-boot:run ou pela sua IDE).
2. Abrir o React no navegador (http://localhost:5173).
3. Clicar no botão "Executar Workflow".
4. Observar na console do terminal do Spring Boot. 

Veremos o fluxo sendo recebido via REST, transformado em mensagens e consumido pelos Workers assincronamente através das filas do RabbitMQ!


