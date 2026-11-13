import { afterEach, expect, it, vi } from 'vitest';
import { taskRepository } from '../tasks/repository';
import { sendGeminiChatMessage } from './gemini';
import type { Task } from '../tasks/types';

vi.mock('../tasks/repository', () => ({
  taskRepository: { listTasks: vi.fn(), createTask: vi.fn() },
}));

const params = {
  apiKey: '  test-key  ',
  activeCategory: 'Pessoal' as const,
  userId: 'usuario',
  userTimezone: 'America/Sao_Paulo',
  messages: [
    { role: 'assistant' as const, content: 'Bem-vindo!' },
    { role: 'user' as const, content: 'O que tenho para fazer nas próximas 48 horas?' },
  ],
};

function candidate(parts: object[]) {
  return Response.json({ candidates: [{ content: { role: 'model', parts } }] });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

it('consulta as próximas 48 horas e devolve ao Gemini o turno assinado com o ID da ferramenta', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
  const task: Task = {
    id: '1', user_id: 'usuario', category: 'Pessoal', title: 'Estudar', description: null,
    due_at: '2026-11-14T12:00:00Z', status: 'pendente', sort_order: 0, created_at: '', updated_at: '',
  };
  vi.mocked(taskRepository.listTasks).mockResolvedValue([
    task, { ...task, id: '2', due_at: '2026-11-14T12:00:01Z' }, { ...task, id: '3', status: 'concluida' },
  ]);
  const parts = [
    { thought: true, text: 'Rascunho' },
    { thoughtSignature: 'signature', functionCall: { id: 'call-1', name: 'list_tasks', args: { filter: 'proximas_48h' } } },
  ];
  const fetch = vi.fn().mockResolvedValueOnce(candidate(parts))
    .mockResolvedValueOnce(candidate([{ thought: true, text: 'Privado' }, { text: 'Estudar.' }]));
  vi.stubGlobal('fetch', fetch);

  await expect(sendGeminiChatMessage(params)).resolves.toEqual({ reply: 'Estudar.', actionExecuted: false });
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
  expect(init.headers['x-goog-api-key']).toBe('test-key');
  expect(JSON.parse(init.body).contents).toHaveLength(1);
  expect(taskRepository.listTasks).toHaveBeenCalledWith('usuario');
  const history = JSON.parse(fetch.mock.calls[1][1].body).contents;
  expect(history[1]).toEqual({ role: 'model', parts });
  const result = history[2].parts[0].functionResponse;
  expect(result).toMatchObject({ id: 'call-1', name: 'list_tasks' });
  expect(result.response.tasks.map((t: Task) => t.id)).toEqual(['1']);
});

it.each([
  [400, 'API_KEY_INVALID', /chave/i],
  [400, 'INVALID_ARGUMENT', /HTTP 400/],
  [403, 'PERMISSION_DENIED', /permissões/i],
  [404, 'NOT_FOUND', /modelo/i],
  [429, 'RESOURCE_EXHAUSTED', /cota/i],
  [503, 'UNAVAILABLE', /temporariamente/i],
])('explica o erro %s (%s) sem tentar outro modelo', async (status, reason, message) => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ error: { details: [{ reason }] } }, { status }));
  vi.stubGlobal('fetch', fetch);
  await expect(sendGeminiChatMessage(params)).rejects.toThrow(message);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('preserva uma gravação confirmada se a conexão cair antes da resposta final', async () => {
  const fetch = vi.fn().mockResolvedValueOnce(candidate([
    { functionCall: { id: 'c', name: 'create_task', args: { category: 'Pessoal', title: 'Estudar' } } },
  ])).mockRejectedValueOnce(new TypeError('fetch failed'));
  vi.stubGlobal('fetch', fetch);
  await expect(sendGeminiChatMessage(params)).resolves.toMatchObject({
    actionExecuted: true, reply: expect.stringContaining('agenda já foi alterada'),
  });
  expect(taskRepository.createTask).toHaveBeenCalledTimes(1);
});
