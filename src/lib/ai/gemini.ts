import { taskRepository } from '../tasks/repository';
import { TaskCategory } from '../tasks/types';

interface GeminiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GeminiChatParams {
  apiKey: string;
  messages: GeminiMessage[];
  activeCategory: TaskCategory;
  userTimezone: string;
  userId: string;
}

export async function sendGeminiChatMessage({
  apiKey,
  messages,
  activeCategory,
  userTimezone,
  userId,
}: GeminiChatParams): Promise<{ reply: string; actionExecuted: boolean }> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Chave de API do Google Gemini não configurada.');
  }

  const systemInstruction = `Você é o Assistente da Agenda Inteligente, em português do Brasil.
Seu objetivo é ajudar o usuário a gerenciar suas tarefas (pessoais, escolares e de trabalho) com clareza, pontualidade e gentileza.

Contexto atual:
- Fuso horário do usuário: ${userTimezone || 'America/Sao_Paulo'}
- Data/Hora de referência atual: ${new Date().toISOString()}
- Categoria atualmente aberta na tela: ${activeCategory || 'Pessoal'}

Regras Críticas:
1. Ao criar tarefas, se a categoria não foi informada pelo usuário, use a categoria atualmente aberta (${activeCategory || 'Pessoal'}) ou pergunte educadamente.
2. NUNCA diga que uma tarefa foi criada, editada ou concluída se a ferramenta não tiver retornado confirmação de sucesso.
3. Para excluir tarefas, SEMPRE peça confirmação explícita ao usuário antes de chamar 'delete_task' com confirmed: true.
4. Ao listar tarefas, apresente de forma amigável com título, prazo (se houver), categoria e status.
5. Seja direto, organizado e calmo.`;

  const tools = [
    {
      functionDeclarations: [
        {
          name: 'create_task',
          description: 'Cria uma nova tarefa na agenda do usuário no banco de dados.',
          parameters: {
            type: 'OBJECT',
            properties: {
              category: {
                type: 'STRING',
                enum: ['Pessoal', 'Escolar', 'Trabalho'],
                description: 'Categoria da tarefa',
              },
              title: {
                type: 'STRING',
                description: 'Título claro da tarefa',
              },
              description: {
                type: 'STRING',
                description: 'Descrição ou detalhes opcionais',
              },
              due_at: {
                type: 'STRING',
                description: 'Data e hora limite no formato ISO 8601 (ex: 2026-11-13T19:00:00Z)',
              },
            },
            required: ['category', 'title'],
          },
        },
        {
          name: 'list_tasks',
          description: 'Consulta tarefas cadastradas na agenda.',
          parameters: {
            type: 'OBJECT',
            properties: {
              category: {
                type: 'STRING',
                enum: ['Pessoal', 'Escolar', 'Trabalho'],
                description: 'Filtrar por categoria específica',
              },
              filter: {
                type: 'STRING',
                enum: ['todas', 'hoje', 'proximas_48h', 'atrasadas'],
                description: 'Filtro temporal ou de status',
              },
            },
          },
        },
        {
          name: 'update_task',
          description: 'Atualiza o título, categoria, prazo ou descrição de uma tarefa existente.',
          parameters: {
            type: 'OBJECT',
            properties: {
              task_id: { type: 'STRING', description: 'ID da tarefa' },
              title: { type: 'STRING' },
              category: { type: 'STRING', enum: ['Pessoal', 'Escolar', 'Trabalho'] },
              due_at: { type: 'STRING', description: 'Novo prazo em ISO 8601' },
              description: { type: 'STRING' },
            },
            required: ['task_id'],
          },
        },
        {
          name: 'complete_task',
          description: 'Marca uma tarefa como concluída ou reabre como pendente.',
          parameters: {
            type: 'OBJECT',
            properties: {
              task_id: { type: 'STRING', description: 'ID da tarefa' },
              completed: { type: 'BOOLEAN', description: 'true para concluída, false para pendente' },
            },
            required: ['task_id', 'completed'],
          },
        },
        {
          name: 'delete_task',
          description: 'Exclui uma tarefa do banco. Exige confirmação prévia.',
          parameters: {
            type: 'OBJECT',
            properties: {
              task_id: { type: 'STRING', description: 'ID da tarefa a excluir' },
              confirmed: {
                type: 'BOOLEAN',
                description: 'Deve ser true após o usuário confirmar expressamente',
              },
            },
            required: ['task_id', 'confirmed'],
          },
        },
      ],
    },
  ];

  // Converte histórico para o formato do Gemini
  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];

  for (const msg of messages) {
    if (msg.role === 'system') continue;
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  }

  // Tenta gemini-2.0-flash primeiro, depois gemini-1.5-flash
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
  let firstResponseData: any = null;
  let activeModel = models[0];

  for (const model of models) {
    try {
      activeModel = model;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            tools,
          }),
        }
      );

      if (res.ok) {
        firstResponseData = await res.json();
        break;
      } else {
        const errJson = await res.json().catch(() => null);
        if (errJson?.error?.message?.includes('API_KEY_INVALID') || res.status === 400) {
          throw new Error(errJson?.error?.message || 'Chave do Google Gemini inválida.');
        }
      }
    } catch (e: any) {
      if (e.message.includes('inválida')) throw e;
      // Continua para o próximo modelo se for erro de versão
    }
  }

  if (!firstResponseData) {
    throw new Error('Falha ao comunicar com a API do Google Gemini. Verifique sua chave nas configurações.');
  }

  const candidate = firstResponseData.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  // Verifica se o Gemini chamou alguma ferramenta
  const functionCallPart = parts.find((p: any) => p.functionCall);

  if (!functionCallPart) {
    const textPart = parts.find((p: any) => p.text);
    return {
      reply: textPart?.text || 'Como posso te ajudar?',
      actionExecuted: false,
    };
  }

  // Executa a Tool solicitada
  const { name: fnName, args: fnArgs } = functionCallPart.functionCall;
  let toolResult: unknown = null;
  let actionExecuted = false;

  if (fnName === 'create_task') {
    const created = await taskRepository.createTask(userId, {
      category: fnArgs.category as TaskCategory,
      title: fnArgs.title,
      description: fnArgs.description,
      due_at: fnArgs.due_at || null,
      status: 'pendente',
    });
    toolResult = { success: true, created_task: created };
    actionExecuted = true;
  } else if (fnName === 'list_tasks') {
    let list = await taskRepository.listTasks(userId);
    if (fnArgs.category) {
      list = list.filter(t => t.category === fnArgs.category);
    }
    toolResult = {
      tasks: list.map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        due_at: t.due_at,
        status: t.status,
      })),
    };
  } else if (fnName === 'update_task') {
    const updated = await taskRepository.updateTask(userId, fnArgs.task_id, {
      title: fnArgs.title,
      category: fnArgs.category,
      due_at: fnArgs.due_at,
      description: fnArgs.description,
    });
    toolResult = { success: true, updated_task: updated };
    actionExecuted = true;
  } else if (fnName === 'complete_task') {
    const updated = await taskRepository.completeTask(userId, fnArgs.task_id, fnArgs.completed);
    toolResult = { success: true, task: updated };
    actionExecuted = true;
  } else if (fnName === 'delete_task') {
    if (!fnArgs.confirmed) {
      toolResult = { error: 'Confirmação pendente. Peça ao usuário autorização para excluir.' };
    } else {
      await taskRepository.deleteTask(userId, fnArgs.task_id);
      toolResult = { success: true, message: 'Tarefa excluída do banco de dados.' };
      actionExecuted = true;
    }
  }

  // Segunda chamada ao Gemini para gerar a resposta final com o resultado da ferramenta
  const followupContents = [
    ...contents,
    {
      role: 'model',
      parts: [functionCallPart],
    },
    {
      role: 'user',
      parts: [
        {
          functionResponse: {
            name: fnName,
            response: { output: toolResult },
          },
        },
      ],
    },
  ];

  const followupRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey.trim()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: followupContents,
      }),
    }
  );

  if (!followupRes.ok) {
    return {
      reply: actionExecuted
        ? 'Ação realizada com sucesso na agenda!'
        : 'Operação concluída.',
      actionExecuted,
    };
  }

  const followupData = await followupRes.json();
  const finalCandidate = followupData.candidates?.[0];
  const finalParts = finalCandidate?.content?.parts || [];
  const textPart = finalParts.find((p: any) => p.text);

  return {
    reply: textPart?.text || 'Ação concluída com sucesso na sua agenda!',
    actionExecuted,
  };
}
