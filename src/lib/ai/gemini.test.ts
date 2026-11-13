import { afterEach, expect, it, vi } from 'vitest';
import { taskRepository } from '../tasks/repository';
import { sendGeminiChatMessage } from './gemini';
import { upcomingQuestion, overdueQuestion } from './agendaQueries';
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
    { role: 'user' as const, content: 'Liste meus prazos para os próximos dois dias.' },
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

it.each([
  [upcomingQuestion, 'No limite'],
  [overdueQuestion, 'Ontem'],
])('responde ao atalho %s diretamente pelo banco', async (question, expected) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-12T12:00:00Z'));
  const base: Task = {
    id: '1', user_id: 'usuario', category: 'Pessoal', title: 'No limite', description: null,
    due_at: '2026-11-14T12:00:00Z', status: 'pendente', sort_order: 0, created_at: '', updated_at: '',
  };
  vi.mocked(taskRepository.listTasks).mockResolvedValue([
    base, { ...base, title: 'Ontem', due_at: '2026-11-11T12:00:00Z' },
    { ...base, title: 'Fora do período', due_at: '2026-11-14T12:00:01Z' },
    { ...base, title: 'Concluída', status: 'concluida' },
  ]);
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const result = await sendGeminiChatMessage({ ...params, messages: [{ role: 'user', content: question }] });
  expect(result.reply.split('\n')).toHaveLength(2);
  expect(result.reply).toContain(expected);
  expect(result.reply).toContain('09:00');
  expect(fetch).not.toHaveBeenCalled();
  expect(taskRepository.listTasks).toHaveBeenCalledWith('usuario');
});

const unavailable = () => Response.json({ error: { status: 'UNAVAILABLE' } }, { status: 503 });

it('recupera um 503 no próprio Gemini 3.8', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockResolvedValueOnce(unavailable()).mockResolvedValueOnce(candidate([{ text: 'Olá!' }]));
  vi.stubGlobal('fetch', fetch);
  const pending = sendGeminiChatMessage(params);
  await vi.runAllTimersAsync();
  expect((await pending).reply).toBe('Olá!');
  expect(fetch.mock.calls.map(([url]) => url)).toEqual(Array(2).fill(expect.stringContaining('gemini-3.8-flash')));
});

it('usa o 3.6 após dois 503 e mantém nele a continuação da ferramenta', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockResolvedValueOnce(unavailable()).mockResolvedValueOnce(unavailable())
    .mockResolvedValueOnce(candidate([{ functionCall: { id: '1', name: 'list_tasks', args: {} } }]))
    .mockResolvedValueOnce(candidate([{ text: 'Agenda consultada.' }]));
  vi.mocked(taskRepository.listTasks).mockResolvedValue([]);
  vi.stubGlobal('fetch', fetch);
  const pending = sendGeminiChatMessage(params);
  await vi.runAllTimersAsync();
  expect((await pending).reply).toBe('Agenda consultada.');
  expect(fetch.mock.calls.map(([url]) => url.match(/gemini-[\d.]+-flash/)[0])).toEqual([
    'gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.6-flash',
  ]);
});

it('não reinicia a conversa nem repete uma gravação quando o 503 ocorre após a criação', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockResolvedValueOnce(candidate([
    { functionCall: { id: '1', name: 'create_task', args: { category: 'Pessoal', title: 'Estudar' } } },
  ])).mockResolvedValueOnce(unavailable()).mockResolvedValueOnce(unavailable());
  vi.stubGlobal('fetch', fetch);
  const pending = sendGeminiChatMessage(params);
  await vi.runAllTimersAsync();
  expect(await pending).toMatchObject({ actionExecuted: true, reply: expect.stringContaining('503') });
  expect(taskRepository.createTask).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(3);
});
