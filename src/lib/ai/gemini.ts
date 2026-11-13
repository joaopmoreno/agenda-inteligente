import { answerAgendaQuestion } from './agendaQueries';
import { taskRepository } from '../tasks/repository';
import { TaskCategory } from '../tasks/types';
import { isTaskDueSoon, isTaskDueToday, isTaskOverdue } from '../tasks/logic';
import { z } from 'zod';

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

const primaryModel = 'gemini-3.8-flash';
const fallbackModel = 'gemini-3.6-flash';
class GeminiUnavailable extends Error {}

const category = z.enum(['Pessoal', 'Escolar', 'Trabalho']);
const taskFields = z.object({
  title: z.string().trim().min(1),
  category,
  description: z.string().optional(),
  due_at: z.string().datetime({ offset: true }).nullish(),
});

const taskCall = z.discriminatedUnion('name', [
  z.object({ name: z.literal('create_task'), args: taskFields }),
  z.object({ name: z.literal('list_tasks'), args: z.object({
    category: category.optional(),
    filter: z.enum(['todas', 'hoje', 'proximas_48h', 'atrasadas']).optional(),
  }).default({}) }),
  z.object({ name: z.literal('update_task'), args: taskFields.partial().extend({ task_id: z.string().min(1) }) }),
  z.object({ name: z.literal('complete_task'), args: z.object({ task_id: z.string().min(1), completed: z.boolean() }) }),
  z.object({ name: z.literal('delete_task'), args: z.object({ task_id: z.string().min(1), confirmed: z.boolean() }) }),
]);

interface GeminiPart {
  text?: string;
  thought?: boolean;
  functionCall?: { id?: string; name: string; args?: unknown };
  functionResponse?: { id?: string; name: string; response: object };
}
interface Content {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

async function generate(model: string, apiKey: string, body: object): Promise<Content> {
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.trim() },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Não foi possível conectar ao Google Gemini. Verifique sua conexão.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const invalidKey = data?.error?.details?.some((d: { reason?: string }) =>
      ['API_KEY_INVALID', 'API_KEY_EXPIRED'].includes(d?.reason ?? '')
    ) || /api key (not valid|expired)/i.test(data?.error?.message ?? '');
    if (res.status === 401 || invalidKey) throw new Error('O Google recusou a chave. Confira a chave do Gemini nas Configurações.');
    if (res.status === 403) throw new Error('Acesso negado (403). Confira as permissões e restrições da chave no projeto do Google.');
    if (res.status === 404) throw new Error(`Modelo ${model} indisponível para esta chamada (404). Confira o acesso no Google AI Studio.`);
    if (res.status === 429) throw new Error('Limite de uso do Gemini atingido (429). Confira a cota no Google AI Studio.');
    if (res.status === 503) throw new GeminiUnavailable(`O Google está com o modelo ${model} indisponível (503). As consultas rápidas de prazos continuam disponíveis.`);
    if (res.status >= 500) throw new Error(`Serviço do Gemini temporariamente indisponível (${res.status}). Tente novamente mais tarde.`);
    throw new Error(`O Google recusou a solicitação ao Gemini (HTTP ${res.status}).`);
  }
  const content = data?.candidates?.[0]?.content;
  if (!Array.isArray(content?.parts) || !content.parts.length) {
    throw new Error(data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason === 'SAFETY'
      ? 'O Gemini bloqueou esta resposta. Tente reformular a pergunta.'
      : 'O Gemini não retornou conteúdo para esta solicitação.');
  }
  return content;
}

async function executeTask(call: z.infer<typeof taskCall>, userId: string, now: Date, timezone: string) {
  switch (call.name) {
    case 'list_tasks': {
      const { category, filter } = call.args;
      const tasks = (await taskRepository.listTasks(userId)).filter(task => {
        if (category && task.category !== category) return false;
        if (filter === 'proximas_48h') return isTaskDueSoon(task, now);
        if (filter === 'hoje') return isTaskDueToday(task, now, timezone);
        if (filter === 'atrasadas') return isTaskOverdue(task, now);
        return true;
      });
      return { tasks: tasks.map(({ id, title, category, due_at, status }) => ({ id, title, category, due_at, status })) };
    }
    case 'create_task':
      return { success: true, task: await taskRepository.createTask(userId, call.args) };
    case 'update_task': {
      const { task_id, ...updates } = call.args;
      return { success: true, task: await taskRepository.updateTask(userId, task_id, updates) };
    }
    case 'complete_task':
      return { success: true, task: await taskRepository.completeTask(userId, call.args.task_id, call.args.completed) };
    case 'delete_task':
      if (!call.args.confirmed) return { error: 'Peça confirmação antes de excluir a tarefa.' };
      await taskRepository.deleteTask(userId, call.args.task_id);
      return { success: true };
  }
}

export async function sendGeminiChatMessage({
  apiKey,
  messages,
  activeCategory,
  userTimezone,
  userId,
}: GeminiChatParams): Promise<{ reply: string; actionExecuted: boolean }> {
  const now = new Date();
  const lastMessage = messages.at(-1);
  if (lastMessage?.role === 'user') {
    const reply = await answerAgendaQuestion(lastMessage.content, userId, userTimezone, now);
    if (reply !== null) return { reply, actionExecuted: false };
  }
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Chave de API do Google Gemini não configurada.');
  }

  const systemInstruction = `Você é o Assistente da Agenda Inteligente, em português do Brasil.
Seu objetivo é ajudar o usuário a gerenciar suas tarefas (pessoais, escolares e de trabalho) com clareza, pontualidade e gentileza.

Contexto atual:
- Fuso horário do usuário: ${userTimezone || 'America/Sao_Paulo'}
- Data/Hora de referência atual: ${now.toISOString()}
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

  const contents: Content[] = [];
  for (const message of messages) {
    if (message.role === 'system') continue;
    if (!contents.length && message.role !== 'user') continue;
    contents.push({ role: message.role === 'user' ? 'user' : 'model', parts: [{ text: message.content }] });
  }

  const config = { systemInstruction: { parts: [{ text: systemInstruction }] }, tools };
  let model = primaryModel;
  let actionExecuted = false;
  async function generateTurn(firstTurn: boolean) {
    const body = { ...config, contents };
    try {
      return await generate(model, apiKey, body);
    } catch (error) {
      if (!(error instanceof GeminiUnavailable)) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      return await generate(model, apiKey, body);
    } catch (error) {
      // Assinaturas de ferramentas pertencem ao modelo que iniciou o turno.
      if (!firstTurn || !(error instanceof GeminiUnavailable)) throw error;
      model = fallbackModel;
      return generate(model, apiKey, body);
    }
  }
  try {
    // Permite consultar IDs antes de editar, sem repetir chamadas que já alteraram a agenda.
    for (let round = 0; round < 5; round++) {
      const content = await generateTurn(round === 0);
      const calls = content.parts.flatMap(part => part.functionCall ? [part.functionCall] : []);
      if (!calls.length) {
        const reply = content.parts.filter(part => !part.thought).map(part => part.text ?? '').join('').trim();
        if (!reply) throw new Error('O Gemini não retornou uma resposta em texto.');
        return { reply, actionExecuted };
      }

      // Preserve o turno original, inclusive as assinaturas de pensamento exigidas pelo Gemini.
      contents.push(content);
      const results: GeminiPart[] = [];
      for (const call of calls) {
        const parsed = taskCall.safeParse(call);
        const response = parsed.success
          ? await executeTask(parsed.data, userId, now, userTimezone)
          : { error: 'Ferramenta ou argumentos inválidos. Confira os parâmetros solicitados.' };
        if ('success' in response && response.success) actionExecuted = true;
        results.push({ functionResponse: { id: call.id, name: call.name, response } });
      }
      contents.push({ role: 'user', parts: results });
    }
    throw new Error('O assistente atingiu o limite de etapas para esta solicitação.');
  } catch (error) {
    if (!actionExecuted) throw error;
    const reason = error instanceof Error ? error.message : 'Falha ao finalizar a resposta.';
    return { reply: `Sua agenda já foi alterada. Confira as tarefas antes de repetir o pedido. ${reason}`, actionExecuted };
  }
}
