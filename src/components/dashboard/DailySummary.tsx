import { Link } from 'react-router-dom';
import { CalendarDays, GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Task } from '../../lib/tasks/types';
import { useGrades } from '../../lib/grades/repository';
import { formatPoints, resultsBySubject } from '../../lib/grades/model';

export function DailySummary({
  tasks,
  now,
  timezone,
  loading,
  failed,
}: {
  tasks: Task[];
  now: Date;
  timezone: string;
  loading: boolean;
  failed: boolean;
}) {
  const { user } = useAuth();
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const today = fmt.format(now),
    year = Number(today.slice(0, 4));
  const items = tasks
    .filter((t) => t.due_at && fmt.format(new Date(t.due_at)) === today)
    .sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!));
  const grades = useGrades(user?.id, year),
    subjects = resultsBySubject(grades.data || []);
  const style = 'rounded-2xl bg-white border border-slate-200 p-5 space-y-3 min-w-0';
  return (
    <div className="grid md:grid-cols-[1.6fr_1fr] gap-4">
      <section className={style}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold flex items-center gap-2">
            <CalendarDays size={19} className="text-brand-600" />
            Calendário de hoje
          </h2>
          <Link to="/calendario" aria-label="Abrir calendário" className="p-2 text-brand-700">
            <ArrowRight size={17} />
          </Link>
        </div>
        {loading ? (
          <p className="text-sm">Carregando…</p>
        ) : failed ? (
          <p className="text-sm">Falha ao carregar o calendário.</p>
        ) : !items.length ? (
          <p className="text-sm text-slate-500">Nenhum compromisso para hoje.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {items.slice(0, 3).map((t) => (
                <li key={t.id} className="flex gap-3 items-baseline text-sm">
                  <time className="text-brand-700 font-semibold tabular-nums">
                    {new Date(t.due_at!).toLocaleTimeString('pt-BR', {
                      timeZone: timezone,
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                  <span
                    className={
                      'truncate ' + (t.status === 'concluida' ? 'line-through text-slate-500' : '')
                    }
                  >
                    {t.title}
                  </span>
                </li>
              ))}
            </ul>
            {items.length > 3 && (
              <Link to="/calendario" className="text-xs text-brand-700">
                Mais {items.length - 3} no calendário
              </Link>
            )}
          </>
        )}
      </section>
      <section className={style}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <GraduationCap size={19} className="text-indigo-700" />
            Notas
          </h2>
          <Link to="/notas" aria-label="Abrir boletim" className="p-2 text-brand-700">
            <ArrowRight size={17} />
          </Link>
        </div>
        {grades.isLoading ? (
          <p className="text-sm">Carregando…</p>
        ) : grades.error ? (
          <p className="text-sm">Falha ao carregar as notas.</p>
        ) : !subjects.length ? (
          <Link to="/notas" className="text-sm text-brand-700">
            Lançar minha primeira nota
          </Link>
        ) : (
          <>
            <ul className="space-y-1">
              {subjects.slice(0, 3).map((s) => (
                <li key={s.name} className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{s.name}</span>
                  <b className="shrink-0">{formatPoints(s.final)} / 60</b>
                </li>
              ))}
            </ul>
            {subjects.length > 3 && (
              <Link className="text-xs text-brand-700" to="/notas">
                Ver todas as {subjects.length} matérias
              </Link>
            )}
          </>
        )}
      </section>
    </div>
  );
}
