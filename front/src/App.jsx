import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Plus, Zap, Mail, MessageSquare, Globe, Clock, 
  Trash2, CheckCircle2, RefreshCw, Send, Sliders,
  Layers, Terminal, Cpu, Database, Sun, Moon, Layout, X
} from 'lucide-react';

const NODE_TYPES = {
  TRIGGER: {
    type: 'trigger',
    label: 'Gatilho (Trigger)',
    category: 'Start',
    icon: Zap,
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
    queue: 'workflow.trigger.queue',
    defaultData: { event: 'user_signup', source: 'Web Portal' }
  },
  EMAIL: {
    type: 'email',
    label: 'Enviar E-mail',
    category: 'Actions',
    icon: Mail,
    color: 'from-blue-500 to-cyan-600',
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
    queue: 'workflow.node.email.queue',
    defaultData: { template: 'welcome_email', recipient: 'user@example.com', subject: 'Bem-vindo!' }
  },
  SLACK: {
    type: 'slack',
    label: 'Notificação Slack',
    category: 'Actions',
    icon: MessageSquare,
    color: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-500',
    queue: 'workflow.node.slack.queue',
    defaultData: { channel: '#growth-team', message: '🚀 Novo usuário cadastrado!' }
  },
  HTTP: {
    type: 'http',
    label: 'Webhook HTTP',
    category: 'Actions',
    icon: Globe,
    color: 'from-purple-500 to-indigo-600',
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
    queue: 'workflow.node.http.queue',
    defaultData: { endpoint: 'https://api.crm.com/v1/leads', method: 'POST' }
  },
  DELAY: {
    type: 'delay',
    label: 'Aguardar (Delay)',
    category: 'Logic',
    icon: Clock,
    color: 'from-pink-500 to-rose-600',
    borderColor: 'border-pink-500/50',
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-500',
    queue: 'workflow.node.delay.queue',
    defaultData: { duration: 2, unit: 'seconds' }
  }
};

const INITIAL_WORKFLOWS = {
  ONBOARDING: {
    name: 'Boas-Vindas & Lead Nurturing',
    nodes: [
      { id: 'node-1', type: 'trigger', x: 80, y: 180, data: { event: 'user_signup', source: 'Web Landing Page' } },
      { id: 'node-2', type: 'email', x: 380, y: 100, data: { template: 'welcome_v1', recipient: 'aluno@udf.edu.br', subject: 'Seja bem-vindo!' } },
      { id: 'node-3', type: 'slack', x: 380, y: 280, data: { channel: '#vendas-alertas', message: '🎉 Novo cadastro no site!' } },
      { id: 'node-4', type: 'delay', x: 680, y: 100, data: { duration: 3, unit: 'seconds' } },
      { id: 'node-5', type: 'http', x: 980, y: 100, data: { endpoint: 'https://api.hubspot.com/v1/contacts', method: 'POST' } }
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2' },
      { id: 'e1-3', source: 'node-1', target: 'node-3' },
      { id: 'e2-4', source: 'node-2', target: 'node-4' },
      { id: 'e4-5', source: 'node-4', target: 'node-5' }
    ]
  },
  ORDER_PROCESS: {
    name: 'Processamento de Pedido',
    nodes: [
      { id: 'node-1', type: 'trigger', x: 80, y: 180, data: { event: 'order_created', source: 'Checkout Service' } },
      { id: 'node-2', type: 'http', x: 380, y: 180, data: { endpoint: 'https://pagamentos.api/v1/charge', method: 'POST' } },
      { id: 'node-3', type: 'email', x: 680, y: 100, data: { template: 'order_receipt', recipient: 'cliente@loja.com', subject: 'Confirmação de Pedido' } },
      { id: 'node-4', type: 'slack', x: 680, y: 260, data: { channel: '#logistica', message: '📦 Novo pedido aprovado para envio!' } }
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2' },
      { id: 'e2-3', source: 'node-2', target: 'node-3' },
      { id: 'e2-4', source: 'node-2', target: 'node-4' }
    ]
  }
};

export default function App() {
  const [nodes, setNodes] = useState(INITIAL_WORKFLOWS.ONBOARDING.nodes);
  const [edges, setEdges] = useState(INITIAL_WORKFLOWS.ONBOARDING.edges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [nodeStates, setNodeStates] = useState({});
  const [activeQueueMessages, setActiveQueueMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('canvas');
  const [connectingSource, setConnectingSource] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const logsEndRef = useRef(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = useCallback((source, message, details = null, level = 'info') => {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      source,
      message,
      details,
      level
    }]);
  }, []);

  const handleCanvasMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (draggingNodeId) {
      setNodes(prev => prev.map(node => {
        if (node.id === draggingNodeId) {
          return {
            ...node,
            x: Math.max(10, Math.min(rect.width - 240, x - dragOffset.x)),
            y: Math.max(10, Math.min(rect.height - 180, y - dragOffset.y))
          };
        }
        return node;
      }));
    }
  };

  const handleMouseUp = () => setDraggingNodeId(null);

  const startDraggingNode = (e, nodeId) => {
    e.stopPropagation();
    if (isExecuting) return;
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);
    setDragOffset({ x: cursorX - node.x, y: cursorY - node.y });
  };

  const handleConnectStart = (e, nodeId) => {
    e.stopPropagation();
    if (isExecuting) return;
    setConnectingSource(nodeId);
  };

  const handleConnectEnd = (e, targetNodeId) => {
    e.stopPropagation();
    if (connectingSource && connectingSource !== targetNodeId) {
      const exists = edges.some(edge => edge.source === connectingSource && edge.target === targetNodeId);
      if (!exists) {
        const newEdge = {
          id: `e-${connectingSource}-${targetNodeId}-${Date.now()}`,
          source: connectingSource,
          target: targetNodeId
        };
        setEdges(prev => [...prev, newEdge]);
        addLog('CANVAS', `Conexão criada: ${connectingSource} ➔ ${targetNodeId}`);
      }
    }
    setConnectingSource(null);
  };

  const addNode = (nodeTypeKey) => {
    if (isExecuting) return;
    const typeObj = NODE_TYPES[nodeTypeKey];
    const id = `node-${Date.now().toString().slice(-4)}`;
    const x = 120 + (nodes.length % 3) * 260;
    const y = 100 + Math.floor(nodes.length / 3) * 160;

    const newNode = { id, type: typeObj.type, x, y, data: { ...typeObj.defaultData } };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(id);
    addLog('CANVAS', `Novo nó adicionado: ${typeObj.label} (${id})`, newNode);
  };

  const updateNodeData = (field, value) => {
    if (!selectedNodeId) return;
    setNodes(prev => prev.map(node => {
      if (node.id === selectedNodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            [field]: value
          }
        };
      }
      return node;
    }));
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId || isExecuting) return;
    setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
    setEdges(prev => prev.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
    addLog('CANVAS', `Nó removido: ${selectedNodeId}`, null, 'warning');
    setSelectedNodeId(null);
  };

  const deleteEdge = (edgeId) => {
    if (isExecuting) return;
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    addLog('CANVAS', `Aresta removida: ${edgeId}`, null, 'warning');
  };

  const loadWorkflowTemplate = (templateKey) => {
    if (isExecuting) return;
    const tpl = INITIAL_WORKFLOWS[templateKey];
    if (tpl) {
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
      setSelectedNodeId(null);
      setNodeStates({});
      setLogs([]);
      addLog('SYSTEM', `Template carregado: "${tpl.name}"`);
    }
  };

  const runWorkflowSimulation = async () => {
    if (isExecuting || nodes.length === 0) return;

    setIsExecuting(true);
    setNodeStates({});
    setActiveQueueMessages([]);
    setLogs([]);

    const payload = {
      workflowId: `wf-${Math.floor(1000 + Math.random() * 9000)}`,
      nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target }))
    };

    addLog('REST', `POST http://localhost:8080/api/workflows/execute`, payload);

    try {
      await fetch('http://localhost:8080/api/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      addLog('SPRING_BOOT', `Requisição enviada com sucesso para a API Spring Boot!`, null, 'success');
    } catch (err) {
      addLog('REST', `Nota: Spring Boot off-line. Rodando modo simulação visual local.`, null, 'warning');
    }

    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode) {
      addLog('SPRING_BOOT', `Erro: Nenhum nó 'trigger' no fluxo!`, null, 'error');
      setIsExecuting(false);
      return;
    }

    const visited = new Set();
    const processNodeExecution = async (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const currentNode = nodes.find(n => n.id === nodeId);
      if (!currentNode) return;

      const nodeConfig = Object.values(NODE_TYPES).find(t => t.type === currentNode.type);
      const queueName = nodeConfig ? nodeConfig.queue : 'workflow.default.queue';

      setNodeStates(prev => ({ ...prev, [nodeId]: 'queued' }));
      const msgId = `msg-${Math.random().toString(36).substring(2, 6)}`;
      
      setActiveQueueMessages(prev => [...prev, { id: msgId, queue: queueName, nodeId }]);
      addLog('RABBITMQ', `Publicado na fila "${queueName}"`, { msgId, nodeId });

      await new Promise(r => setTimeout(r, 800));

      setActiveQueueMessages(prev => prev.filter(m => m.id !== msgId));
      setNodeStates(prev => ({ ...prev, [nodeId]: 'running' }));
      addLog('SPRING_WORKER', `@RabbitListener processando nó ${nodeId}...`, currentNode.data);

      const processingTime = currentNode.type === 'delay' ? 2000 : 1200;
      await new Promise(r => setTimeout(r, processingTime));

      setNodeStates(prev => ({ ...prev, [nodeId]: 'success' }));
      addLog('WEBSOCKET', `Nó ${nodeId} executado com SUCESSO`, { status: 200 }, 'success');

      const childNodeIds = edges.filter(e => e.source === nodeId).map(e => e.target);
      for (const childId of childNodeIds) {
        await processNodeExecution(childId);
      }
    };

    await processNodeExecution(triggerNode.id);
    addLog('SPRING_BOOT', `Workflow ID ${payload.workflowId} finalizado!`, null, 'success');
    setIsExecuting(false);
  };

  const renderEdges = () => {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
        </defs>

        {edges.map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;

          const x1 = sourceNode.x + 220;
          const y1 = sourceNode.y + 65;
          const x2 = targetNode.x;
          const y2 = targetNode.y + 65;

          const dx = Math.abs(x2 - x1) * 0.5;
          const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
          const isSourceRunning = nodeStates[edge.source] === 'running' || nodeStates[edge.source] === 'queued';

          return (
            <g key={edge.id} className="group pointer-events-auto">
              <path
                d={pathD}
                fill="none"
                stroke={isSourceRunning ? "#3b82f6" : "#475569"}
                strokeWidth={isSourceRunning ? "3" : "2"}
                strokeDasharray={isSourceRunning ? "6 6" : "none"}
                markerEnd={isSourceRunning ? "url(#arrow-active)" : "url(#arrow)"}
              />
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth="12"
                className="cursor-pointer"
                onClick={() => deleteEdge(edge.id)}
              />
            </g>
          );
        })}

        {connectingSource && (() => {
          const sourceNode = nodes.find(n => n.id === connectingSource);
          if (!sourceNode) return null;
          const x1 = sourceNode.x + 220;
          const y1 = sourceNode.y + 65;
          const x2 = mousePos.x;
          const y2 = mousePos.y;
          const dx = Math.abs(x2 - x1) * 0.5;
          return (
            <path
              d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          );
        })()}
      </svg>
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} flex flex-col font-sans select-none`}>
      {/* Top Header */}
      <header className={`h-16 border-b ${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} px-6 flex items-center justify-between backdrop-blur sticky top-0 z-50`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg text-white">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide flex items-center gap-2">
              Spring Boot + RabbitMQ Workflow Engine
            </h1>
            <p className="text-xs text-slate-400">Integração React Flow com Arquitetura Orientada a Eventos</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
            <button onClick={() => loadWorkflowTemplate('ONBOARDING')} disabled={isExecuting} className="text-xs px-2.5 py-1.5 rounded-md hover:bg-slate-700 font-medium text-slate-300">
              Template 1
            </button>
            <button onClick={() => loadWorkflowTemplate('ORDER_PROCESS')} disabled={isExecuting} className="text-xs px-2.5 py-1.5 rounded-md hover:bg-slate-700 font-medium text-slate-300">
              Template 2
            </button>
          </div>

          <button
            onClick={runWorkflowSimulation}
            disabled={isExecuting || nodes.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm shadow-lg transition-all ${
              isExecuting ? 'bg-amber-600 cursor-wait text-white' : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-400'
            }`}
          >
            {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            {isExecuting ? 'Processando...' : 'Executar Workflow'}
          </button>

          <button onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} className="p-2 rounded-lg border border-slate-700">
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Painel Esquerdo: Menu de Nós */}
        <aside className="w-64 border-r border-slate-800 p-4 flex flex-col gap-6 bg-slate-900/50">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Adicionar Nós
            </h2>
            <div className="space-y-2">
              {Object.keys(NODE_TYPES).map(key => {
                const item = NODE_TYPES[key];
                const Icon = item.icon;
                return (
                  <button
                    key={key}
                    onClick={() => addNode(key)}
                    disabled={isExecuting}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-800 hover:bg-slate-800 text-left transition"
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color} text-white`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold">{item.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{item.queue}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-auto border-t border-slate-800 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-orange-400" /> RabbitMQ Queues
            </h3>
            <div className="space-y-1.5 font-mono text-[11px]">
              {Object.values(NODE_TYPES).map(nt => {
                const pendingCount = activeQueueMessages.filter(m => m.queue === nt.queue).length;
                return (
                  <div key={nt.queue} className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800">
                    <span className="text-slate-400 truncate max-w-[130px]">{nt.type}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${pendingCount > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse font-bold' : 'text-slate-500'}`}>
                      {pendingCount} msg
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Centro: Canvas de Edição & Execução */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-950">
          <div className="flex items-center justify-between px-6 py-2 border-b border-slate-800 bg-slate-900/30">
            <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button onClick={() => setActiveTab('canvas')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${activeTab === 'canvas' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                <Layout className="w-3.5 h-3.5" /> Canvas
              </button>
              <button onClick={() => setActiveTab('json')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${activeTab === 'json' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                <Terminal className="w-3.5 h-3.5" /> Payload JSON
              </button>
              <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${activeTab === 'logs' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                <Cpu className="w-3.5 h-3.5" /> Console Logs
              </button>
            </div>

            {selectedNodeId && activeTab === 'canvas' && (
              <button onClick={deleteSelectedNode} disabled={isExecuting} className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/20">
                <Trash2 className="w-3.5 h-3.5" /> Excluir Nó
              </button>
            )}
          </div>

          {activeTab === 'canvas' && (
            <div
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleMouseUp}
              className="flex-1 relative overflow-auto cursor-crosshair bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
            >
              {renderEdges()}

              {nodes.map(node => {
                const nodeTypeObj = Object.values(NODE_TYPES).find(t => t.type === node.type) || NODE_TYPES.TRIGGER;
                const Icon = nodeTypeObj.icon;
                const isSelected = selectedNodeId === node.id;
                const state = nodeStates[node.id] || 'idle';

                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => startDraggingNode(e, node.id)}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                    className={`absolute w-56 rounded-2xl border backdrop-blur-md transition-all shadow-xl ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-500/40 bg-slate-900' : 'border-slate-800 bg-slate-900/80'
                    }`}
                  >
                    <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${nodeTypeObj.color} text-white`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">{nodeTypeObj.label}</h4>
                          <span className="text-[10px] font-mono text-slate-500">{node.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 text-[11px] space-y-1 font-mono text-slate-400">
                      {Object.entries(node.data).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center truncate">
                          <span className="text-slate-500">{k}:</span>
                          <span className="text-slate-300 font-semibold truncate max-w-[100px]">{String(v)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="px-3 py-2 border-t border-slate-800 flex items-center justify-between bg-slate-950/40 rounded-b-2xl">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">{state}</span>
                    </div>

                    {node.type !== 'trigger' && (
                      <div
                        onMouseUp={(e) => handleConnectEnd(e, node.id)}
                        className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 hover:border-blue-400 flex items-center justify-center cursor-pointer"
                      >
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                      </div>
                    )}

                    <div
                      onMouseDown={(e) => handleConnectStart(e, node.id)}
                      className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 hover:border-emerald-400 flex items-center justify-center cursor-pointer"
                    >
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'json' && (
            <div className="flex-1 p-6 overflow-auto font-mono text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-3">
                  <span className="text-emerald-400 font-semibold">POST /api/workflows/execute Payload</span>
                  <span className="text-slate-500">Expressão do Grafo para Spring Boot</span>
                </div>
                <pre className="text-slate-300 whitespace-pre-wrap">
                  {JSON.stringify({
                    workflowId: "wf-12345",
                    nodes: nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
                    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target }))
                  }, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2 bg-slate-950">
              {logs.map((log) => (
                <div key={log.id} className="p-2 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">[{log.timestamp}]</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-blue-400">{log.source}</span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </main>

        {/* Painel Lateral Direito: Propriedades do Nó Selecionado */}
        <aside className="w-80 border-l border-slate-800 p-5 bg-slate-900/50 flex flex-col gap-5 overflow-y-auto">
          {selectedNode ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-sm text-slate-200">Propriedades do Nó</h3>
                </div>
                <button 
                  onClick={() => setSelectedNodeId(null)} 
                  className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ID do Nó</label>
                  <input
                    type="text"
                    disabled
                    value={selectedNode.id}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fila RabbitMQ Destino</label>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-amber-400/90 truncate">
                    {Object.values(NODE_TYPES).find(t => t.type === selectedNode.type)?.queue}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-300">Parâmetros de Configuração</h4>

                  {Object.entries(selectedNode.data).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs text-slate-400 capitalize">{key}:</label>
                      <input
                        type="text"
                        disabled={isExecuting}
                        value={value}
                        onChange={(e) => updateNodeData(key, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-auto border-t border-slate-800 pt-4">
                <button
                  onClick={deleteSelectedNode}
                  disabled={isExecuting}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition"
                >
                  <Trash2 className="w-4 h-4" /> Remover do Fluxo
                </button>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-2 my-auto">
              <Sliders className="w-8 h-8 opacity-40" />
              <p className="text-xs">Selecione uma caixa no canvas para visualizar e editar suas propriedades.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}