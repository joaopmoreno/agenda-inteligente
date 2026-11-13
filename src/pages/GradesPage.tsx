import { FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Pencil, Trash2, ChevronDown, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useGrades, saveGrade, removeGrade } from '../lib/grades/repository';
import { Grade, terms, resultsBySubject, formatPoints, passingScore } from '../lib/grades/model';

const inputClass =
  'block w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 mt-1 text-sm font-normal';
const primary =
  'rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-50';
type Draft = {
  id: string;
  editing: boolean;
  subject: string;
  title: string;
  points: string;
  term: number;
};

export function GradesPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const currentYear = Number(
    new Intl.DateTimeFormat('en', {
      year: 'numeric',
      timeZone: profile?.timezone || 'America/Sao_Paulo',
    }).format(new Date())
  );
  const [year, setYear] = useState(currentYear);
  const query = useGrades(user?.id, year);
  const cache = useQueryClient();
  const subjects = resultsBySubject(query.data || []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Grade | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = () => cache.invalidateQueries({ queryKey: ['grades', user!.id, year] });
  function begin(grade?: Grade) {
    setError('');
    setDraft({
      id: grade?.id || crypto.randomUUID(),
      editing: !!grade,
      subject: grade?.subject || '',
      title: grade?.title || '',
      points: grade ? formatPoints(grade.points).replaceAll('.', '') : '',
      term: grade?.term || 1,
    });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!draft || busy || !user) return;
    const points = Number(draft.points.trim().replace(',', '.'));
    const subject = draft.subject.trim().replace(/\s+/g, ' '),
      title = draft.title.trim();
    if (!subject || !title || !/^\d{1,5}([.,]\d{1,2})?$/.test(draft.points.trim())) {
      setError(
        'Preencha a matéria, o nome da avaliação e uma pontuação positiva ou zero, com até duas casas decimais.'
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveGrade(
        user.id,
        draft.id,
        { subject, title, points, term: draft.term, school_year: year },
        draft.editing
      );
      await refresh();
      setDraft(null);
    } catch {
      setError('Falha ao salvar a nota. Confira sua conexão e tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  async function erase() {
    if (!deleting || busy || !user) return;
    setBusy(true);
    setError('');
    try {
      await removeGrade(user.id, deleting.id);
      await refresh();
      setDeleting(null);
    } catch {
      setDeleting(null);
      setError('Falha ao excluir a nota. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notas</h1>
          <p className="text-sm text-slate-600 mt-1">Boletim por matéria · Mínimo de 60 pontos no ano</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600">
            Ano letivo
            <select
              className={inputClass}
              value={year}
              disabled={!!draft || busy}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {Array.from(
                { length: Math.max(8, currentYear - 2020 + 2) },
                (_, i) => currentYear + 1 - i
              ).map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <button className={primary + ' self-end'} onClick={() => begin()} disabled={!!draft || busy}>
            <Plus size={16} />
            Lançar nota
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
      {draft && (
        <form onSubmit={submit} className="bg-white border border-brand-100 rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-lg">{draft.editing ? 'Editar nota' : 'Lançar nota'}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm font-semibold">
              Matéria
              <input
                className={inputClass}
                autoFocus
                list="subjects"
                maxLength={100}
                required
                placeholder="Ex.: Matemática"
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              />
            </label>
            <datalist id="subjects">
              {subjects.map((s) => (
                <option key={s.name} value={s.name} />
              ))}
            </datalist>
            <label className="text-sm font-semibold">
              Nome da avaliação
              <input
                className={inputClass}
                required
                maxLength={160}
                placeholder="Ex.: Prova de álgebra"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label className="text-sm font-semibold">
              Pontuação obtida
              <input
                className={inputClass}
                inputMode="decimal"
                required
                placeholder="Ex.: 7,5"
                value={draft.points}
                onChange={(e) => setDraft({ ...draft, points: e.target.value })}
              />
            </label>
            <label className="text-sm font-semibold">
              Trimestre
              <select
                className={inputClass}
                aria-label="Trimestre"
                value={draft.term}
                onChange={(e) => setDraft({ ...draft, term: Number(e.target.value) })}
              >
                {terms.map((t) => (
                  <option key={t} value={t}>
                    {t}º trimestre
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDraft(null);
                setError('');
              }}
            >
              Cancelar
            </button>
            <button className={primary} disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar nota'}
            </button>
          </div>
        </form>
      )}
      {query.isLoading ? (
        <p>Carregando boletim…</p>
      ) : query.error ? (
        <p role="alert">
          Não foi possível carregar as notas.{' '}
          <button onClick={() => query.refetch()} className="underline">
            Tentar novamente
          </button>
        </p>
      ) : !subjects.length ? (
        <div className="rounded-2xl border border-slate-200 p-8 bg-white text-center">
          <GraduationCap className="mx-auto text-brand-600 mb-3" />
          <h2 className="font-semibold">Nenhuma nota em {year}</h2>
          <p className="text-sm text-slate-600 mt-1">Use “Lançar nota” para começar seu boletim.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => (
            <details
              key={subject.name}
              className="group rounded-2xl bg-white border border-slate-200 overflow-hidden"
            >
              <summary className="cursor-pointer list-none p-4 sm:p-5 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_1fr_8rem] items-center">
                <div className="flex gap-3 items-center min-w-0">
                  <BookOpen size={20} className="shrink-0 text-brand-600" />
                  <h2 className="font-bold break-words min-w-0">{subject.name}</h2>
                  <ChevronDown size={16} className="ml-auto md:ml-0 group-open:rotate-180" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {terms.map((t) => (
                    <div key={t} className="rounded-lg bg-slate-50 px-2 py-1">
                      <span className="block text-xs text-slate-500">{t}º tri.</span>
                      <b>{formatPoints(subject.totals[t - 1])}</b>
                    </div>
                  ))}
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Nota final</span>
                  <strong className="text-xl">
                    {formatPoints(subject.final)} <span className="text-sm text-slate-600">/ 60</span>
                  </strong>
                  <span className="text-xs text-brand-700 block">
                    {subject.final >= passingScore
                      ? 'Meta atingida'
                      : subject.final === passingScore - 1
                        ? 'Falta 1 ponto'
                        : `Faltam ${formatPoints(passingScore - subject.final)} pts`}
                  </span>
                </div>
              </summary>
              <div className="px-5 pb-4 border-t border-slate-200">
                {terms
                  .filter((t) => subject.grades.some((g) => g.term === t))
                  .map((t) => (
                    <section key={t} className="pt-3">
                      <h3 className="text-xs font-bold text-slate-500 uppercase">{t}º trimestre</h3>
                      {subject.grades
                        .filter((g) => g.term === t)
                        .map((g) => (
                          <div
                            key={g.id}
                            className="flex items-center gap-2 py-2 border-b border-slate-100"
                          >
                            <span className="flex-1 min-w-0 break-words text-sm">{g.title}</span>
                            <b className="text-sm">{formatPoints(g.points)} pts</b>
                            <button
                              aria-label={'Editar ' + g.title}
                              disabled={busy || !!draft}
                              onClick={() => begin(g)}
                              className="p-2"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              aria-label={'Excluir ' + g.title}
                              disabled={busy || !!draft}
                              onClick={() => setDeleting(g)}
                              className="p-2 text-rose-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                    </section>
                  ))}
              </div>
            </details>
          ))}
        </div>
      )}
      <ConfirmDialog
        isOpen={!!deleting}
        title="Excluir nota?"
        message={`A pontuação de “${deleting?.title || ''}” será retirada da soma.`}
        onCancel={() => setDeleting(null)}
        onConfirm={erase}
        isLoading={busy}
      />
    </div>
  );
}
