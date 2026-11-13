import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { taskRepository } from '../lib/tasks/repository';
import { TaskModal } from '../components/agenda/TaskModal';
import type { Task } from '../lib/tasks/types';

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const button =
  'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50';

export function CalendarPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const cache = useQueryClient();
  const timezone = profile?.timezone || 'America/Sao_Paulo';
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const today = fmt.format(new Date());
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(new Date(today + 'T12:00:00'));
  const [editing, setEditing] = useState<Task | null>(null);
  const tasks = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => taskRepository.listTasks(user!.id),
    enabled: !!user,
  });
  const dates = new Map<string, Task[]>();
  for (const task of tasks.data || []) {
    if (!task.due_at) continue;
    const key = fmt.format(new Date(task.due_at));
    dates.set(key, [...(dates.get(key) || []), task]);
  }
  const y = month.getFullYear(),
    m = month.getMonth();
  const cells = Array.from({ length: new Date(y, m, 1).getDay() }, (_, i) => <span key={'blank' + i} />);
  for (let d = 1; d <= new Date(y, m + 1, 0).getDate(); d++) {
    const key = [y, String(m + 1).padStart(2, '0'), String(d).padStart(2, '0')].join('-');
    const count = dates.get(key)?.length || 0;
    cells.push(
      <button
        key={key}
        onClick={() => setSelected(key)}
        aria-pressed={key === selected}
        aria-label={key + ', ' + count + ' tarefas'}
        className={
          'relative rounded-lg min-h-[44px] text-sm ' +
          (key === selected ? 'bg-brand-700 text-white' : 'hover:bg-slate-100 text-slate-800') +
          (key === today ? ' ring-1 ring-brand-500' : '')
        }
      >
        {d}
        {count > 0 && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-current" />
        )}
      </button>
    );
  }
  function shift(offset: number) {
    const target = new Date(y, m + offset, 1, 12);
    setMonth(target);
    setSelected([target.getFullYear(), String(target.getMonth() + 1).padStart(2, '0'), '01'].join('-'));
  }
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Calendário</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <section className="p-4 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold capitalize">
              {month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex">
              <button className={button} aria-label="Mês anterior" onClick={() => shift(-1)}>
                <ChevronLeft size={16} />
              </button>
              <button className={button} aria-label="Próximo mês" onClick={() => shift(1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 text-center gap-1">
            {weekdays.map((d) => (
              <span className="text-xs text-slate-500" key={d}>
                {d}
              </span>
            ))}
            {cells}
          </div>
        </section>
        <section className="rounded-2xl p-5 bg-white border border-slate-200 space-y-3">
          <h2 className="font-bold">
            {new Date(selected + 'T12:00:00').toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
            })}
          </h2>
          {tasks.isLoading ? (
            'Carregando…'
          ) : tasks.error ? (
            <p role="alert">Erro ao carregar as tarefas.</p>
          ) : (dates.get(selected) || []).length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma tarefa para este dia.</p>
          ) : (
            dates
              .get(selected)!
              .sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!))
              .map((task) => (
                <button
                  key={task.id}
                  onClick={() => setEditing(task)}
                  className="w-full text-left rounded-lg bg-slate-50 p-3 text-sm"
                >
                  <strong>{task.title}</strong>
                  <span className="block text-xs text-slate-500">
                    {new Date(task.due_at!).toLocaleTimeString('pt-BR', {
                      timeZone: timezone,
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {task.category}
                  </span>
                </button>
              ))
          )}
        </section>
      </div>
      <TaskModal
        isOpen={!!editing}
        initialTask={editing}
        defaultCategory="Pessoal"
        onClose={() => setEditing(null)}
        onSave={async (data) => {
          if (editing) {
            await taskRepository.updateTask(user!.id, editing.id, data);
            await cache.invalidateQueries({ queryKey: ['tasks'] });
          }
        }}
      />
    </div>
  );
}
