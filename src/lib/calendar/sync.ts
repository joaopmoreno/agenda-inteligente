import { supabase } from '../supabase/client';
import type { Task } from '../tasks/types';
import { CalendarError, googleRequest, listEvents } from './google';
import type { CalendarAccess, GoogleEvent } from './google';

interface Fields {
  title: string;
  description: string;
  due_at: string | null;
}
interface Link {
  event_id: string;
  task_id: string | null;
  etag: string;
  snapshot: Fields;
}
const day = 86400000;

function fields(task: Task): Fields {
  return {
    title: task.title,
    description: task.description || '',
    due_at: task.due_at && new Date(task.due_at).toISOString(),
  };
}

// O último minuto do dia civil no fuso do perfil é o prazo de um evento de dia inteiro.
function endOfDay(date: string, timezone: string) {
  const target = Date.parse(date + 'T23:59:00Z');
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const wall = Date.parse(fmt.format(guess).replace(' ', 'T') + ':00Z');
    guess += target - wall;
  }
  return new Date(guess).toISOString();
}
export function eventFields(event: GoogleEvent, timezone: string): Fields {
  const start = event.start;
  return {
    title: event.summary?.trim() || 'Compromisso',
    description: event.description || '',
    due_at: start?.dateTime
      ? new Date(start.dateTime).toISOString()
      : start?.date
        ? endOfDay(start.date, timezone)
        : null,
  };
}

export function eventPatch(
  task: Fields,
  baseline: Fields | null,
  event?: GoogleEvent
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (task.title !== baseline?.title) patch.summary = task.title;
  if (task.description !== baseline?.description) patch.description = task.description;
  if (task.due_at && task.due_at !== baseline?.due_at) {
    const duration =
      event?.end?.dateTime && event.start?.dateTime
        ? Date.parse(event.end.dateTime) - Date.parse(event.start.dateTime)
        : 30 * 60000;
    patch.start = { dateTime: task.due_at };
    patch.end = {
      dateTime: new Date(Date.parse(task.due_at) + Math.max(60000, duration)).toISOString(),
    };
  }
  return patch;
}

async function importedId(owner: string, subject: string, event: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify([owner, subject, event]))
    )
  );
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes.slice(0, 16), (n) => n.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join(
    '-'
  );
}

async function pages<T>(
  read: (offset: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await read(offset);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}

export async function syncCalendar(owner: string, access: CalendarAccess, timezone: string) {
  const now = Date.now();
  const [tasks, links, events] = await Promise.all([
    pages<Task>((n) =>
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', owner)
        .order('id')
        .range(n, n + 499)
    ),
    pages<Link>((n) =>
      supabase
        .from('calendar_links')
        .select('event_id,task_id,etag,snapshot')
        .eq('user_id', owner)
        .eq('google_subject', access.subject)
        .order('event_id')
        .range(n, n + 499)
    ),
    listEvents(access, new Date(now - 30 * day), new Date(now + 365 * day)),
  ]);
  const byEvent = new Map(links.map((link) => [link.event_id, link]));
  const byTask = new Map(links.map((link) => [link.task_id, link]));
  const remote = new Map(events.map((event) => [event.id, event]));
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const eventId = (id: string) => 'ag' + id.replaceAll('-', '');
  let conflicts = 0;
  const save = async (event: GoogleEvent, id: string, snapshot: Fields, previous?: Link) => {
    const table = supabase.from('calendar_links');
    const result = previous
      ? await table
          .update({ etag: event.etag, snapshot })
          .eq('user_id', owner)
          .eq('google_subject', access.subject)
          .eq('event_id', event.id)
          .eq('etag', previous.etag)
      : await table.upsert(
          {
            user_id: owner,
            google_subject: access.subject,
            event_id: event.id,
            task_id: id,
            etag: event.etag,
            snapshot,
          },
          { onConflict: 'user_id,google_subject,event_id', ignoreDuplicates: true }
        );
    if (result.error) throw new Error(result.error.message);
  };

  for (const event of events) {
    if (byEvent.has(event.id) || event.status === 'cancelled' || !event.start) continue;
    const value = eventFields(event, timezone);
    // Recupera também o caso em que o POST ao Google terminou, mas o vínculo ainda não foi salvo.
    const exported = /^ag[0-9a-f]{32}$/.test(event.id)
      ? byId.get(
          event.id.slice(2).replace(/^(........)(....)(....)(....)(............)$/, '$1-$2-$3-$4-$5')
        )
      : undefined;
    const id = exported?.id || (await importedId(owner, access.subject, event.id));
    if (!exported) {
      const { error } = await supabase
        .from('tasks')
        .upsert(
          { id, user_id: owner, category: 'Pessoal', ...value },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      if (error) throw new Error(error.message);
    }
    await save(event, id, value);
    byTask.set(id, { event_id: event.id, task_id: id, etag: event.etag, snapshot: value });
  }

  for (const task of tasks) {
    const local = fields(task);
    const link = byTask.get(task.id);
    if (!link) {
      if (!local.due_at) continue;
      try {
        const event = await googleRequest<GoogleEvent>(access, '', {
          method: 'POST',
          body: JSON.stringify({ id: eventId(task.id), ...eventPatch(local, null) }),
        });
        await save(event, task.id, local);
      } catch (err) {
        if (!(err instanceof CalendarError) || err.status !== 409) throw err;
        const existing = await googleRequest<GoogleEvent>(access, '/' + eventId(task.id));
        if (existing.status !== 'cancelled')
          await save(existing, task.id, eventFields(existing, timezone));
      }
      continue;
    }
    const changes = eventPatch(local, link.snapshot);
    let event = remote.get(link.event_id);
    if (!event && Object.keys(changes).length) {
      try {
        event = await googleRequest<GoogleEvent>(access, '/' + encodeURIComponent(link.event_id));
      } catch (err) {
        if (err instanceof CalendarError && [404, 410].includes(err.status)) continue;
        throw err;
      }
    }
    if (!event || event.status === 'cancelled' || !event.start) continue;
    const value = eventFields(event, timezone);
    const different =
      event.etag !== link.etag || Object.keys(eventPatch(value, link.snapshot)).length > 0;
    if (!different && !Object.keys(changes).length) continue;
    // Mudanças simultâneas no mesmo campo preservam o valor do calendário.
    const patch = eventPatch(local, link.snapshot, event);
    const incoming: Partial<Fields> = {};
    for (const key of ['title', 'description', 'due_at'] as const) {
      if (!different || value[key] === link.snapshot[key]) continue;
      if (local[key] !== link.snapshot[key] && local[key] !== value[key]) conflicts++;
      Object.assign(incoming, { [key]: value[key] });
      if (key === 'due_at') {
        delete patch.start;
        delete patch.end;
      } else delete patch[key === 'title' ? 'summary' : 'description'];
    }
    if (Object.keys(patch).length) {
      if (event.locked || (event.organizer && event.organizer.self !== true && !event.guestsCanModify)) {
        conflicts++;
        Object.assign(incoming, value);
      } else {
        event = await googleRequest<GoogleEvent>(access, '/' + encodeURIComponent(event.id), {
          method: 'PATCH',
          headers: { 'If-Match': event.etag },
          body: JSON.stringify(patch),
        });
      }
    }
    if (Object.keys(incoming).length) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...incoming, updated_at: new Date().toISOString() })
        .eq('user_id', owner)
        .eq('id', task.id)
        .eq('updated_at', task.updated_at)
        .select('id');
      if (error) throw new Error(error.message);
      if (!data?.length) continue;
    }
    await save(event, task.id, { ...local, ...incoming }, link);
  }
  return conflicts;
}
