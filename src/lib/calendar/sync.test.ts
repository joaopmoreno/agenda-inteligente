import { beforeEach, expect, it, vi } from 'vitest';
import type { GoogleEvent } from './google';
import { eventFields, eventPatch, syncCalendar } from './sync';
import { authorizeCalendar, googleRequest, listEvents } from './google';
import { supabase } from '../supabase/client';

vi.mock('../supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('./google', async (load) => ({
  ...(await load<typeof import('./google')>()),
  googleRequest: vi.fn(),
  listEvents: vi.fn(),
}));

const owner = 'owner',
  access = { token: 'fixture', subject: 'subject', email: 'a@example.org', expires: Infinity };
const base = { title: 'Reunião', description: '', due_at: '2026-11-15T12:00:00.000Z' };
const event: GoogleEvent = {
  id: 'google-event',
  etag: 'rev1',
  summary: base.title,
  start: { dateTime: base.due_at },
  end: { dateTime: '2026-11-15T14:00:00Z' },
};
const taskId = '00000000-0000-4080-8000-000000000001';
type Row = Record<string, unknown>;
let db: Record<string, Row[]>;

beforeEach(() => {
  vi.clearAllMocks();
  db = { tasks: [], calendar_links: [] };
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    const rows = db[table],
      filters: Record<string, unknown> = {};
    let update: Row | undefined;
    const query = {
      select: () => query,
      order: () => query,
      eq: (k: string, v: unknown) => {
        filters[k] = v;
        return query;
      },
      range: () => query,
      update: (v: Row) => {
        update = v;
        return query;
      },
      upsert: async (v: Row) => {
        if (!rows.some((r) => (table === 'tasks' ? r.id === v.id : r.event_id === v.event_id)))
          rows.push({ ...v });
        return { error: null };
      },
      then: (resolve: (value: unknown) => void) => {
        const data = rows.filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v));
        if (update) for (const row of data) Object.assign(row, update);
        resolve({ data: structuredClone(data), error: null });
      },
    };
    return query as never;
  });
});

it('importa e exporta na mesma passagem e repetir não duplica itens', async () => {
  db.tasks.push({ id: taskId, user_id: owner, ...base });
  const events = [event];
  vi.mocked(listEvents).mockImplementation(async () => [...events]);
  vi.mocked(googleRequest).mockImplementation(async (_a, _path, init) => {
    const created = { ...event, ...JSON.parse(String(init?.body)), etag: 'remote-rev' };
    events.push(created);
    return created;
  });
  await syncCalendar(owner, access, 'America/Sao_Paulo');
  await syncCalendar(owner, access, 'America/Sao_Paulo');
  expect(db.tasks).toHaveLength(2);
  expect(db.calendar_links).toHaveLength(2);
  expect(googleRequest).toHaveBeenCalledTimes(1);
});

it('combina uma mudança de nome no Google com um novo prazo no site e preserva a duração', async () => {
  const newDue = '2026-11-16T12:00:00.000Z';
  db.tasks.push({ id: taskId, user_id: owner, ...base, due_at: newDue, updated_at: 'stamp' });
  db.calendar_links.push({
    user_id: owner,
    google_subject: access.subject,
    event_id: event.id,
    task_id: taskId,
    snapshot: base,
    etag: event.etag,
  });
  const changed = { ...event, etag: 'rev2', summary: 'Renomeada' };
  vi.mocked(listEvents).mockResolvedValue([changed]);
  vi.mocked(googleRequest).mockResolvedValue({ ...changed, etag: 'rev3', start: { dateTime: newDue } });
  await syncCalendar(owner, access, 'America/Sao_Paulo');
  expect(db.tasks[0]).toMatchObject({ title: 'Renomeada', due_at: newDue });
  const options = vi.mocked(googleRequest).mock.calls[0][2]!;
  expect(options.headers).toEqual({ 'If-Match': 'rev2' });
  expect(JSON.parse(String(options.body))).toEqual({
    start: { dateTime: newDue },
    end: { dateTime: '2026-11-16T14:00:00.000Z' },
  });
});

it('mantém eventos de dia inteiro no dia correto do perfil', () => {
  const allDay = { ...event, start: { date: '2026-11-15' } };
  const original = eventFields(allDay, 'America/Sao_Paulo');
  expect(original.due_at).toBe('2026-11-16T02:59:00.000Z');
  expect(eventPatch({ ...original, title: 'Outro nome' }, original, allDay)).toEqual({
    summary: 'Outro nome',
  });
});

it('recusa autorização de outra conta antes de acessar eventos', async () => {
  try {
    vi.stubGlobal('window', {
      google: {
        accounts: {
          oauth2: {
            initTokenClient: (config: { callback: Function }) => ({
              requestAccessToken: () => config.callback({ access_token: 'fixture', expires_in: 60 }),
            }),
          },
        },
      },
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ email_verified: true, sub: 'outro', email: 'b@example.org' }))
    );
    await expect(authorizeCalendar('fixture', access.email)).rejects.toThrow('mesmo e-mail');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(googleRequest).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
