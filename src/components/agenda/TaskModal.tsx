import React, { useState, useEffect } from 'react';
import { X, Calendar, Loader2 } from 'lucide-react';
import { Task, TaskCategory, TaskStatus, NewTaskInput } from '../../lib/tasks/types';
import { toDateTimeLocalValue, fromDateTimeLocalValue } from '../../lib/utils/date';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewTaskInput) => Promise<void>;
  initialTask?: Task | null;
  defaultCategory?: TaskCategory;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  defaultCategory = 'Pessoal',
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>(defaultCategory);
  const [description, setDescription] = useState('');
  const [dueDateTimeLocal, setDueDateTimeLocal] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pendente');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setCategory(initialTask.category);
      setDescription(initialTask.description || '');
      setDueDateTimeLocal(toDateTimeLocalValue(initialTask.due_at));
      setStatus(initialTask.status);
    } else {
      setTitle('');
      setCategory(defaultCategory);
      setDescription('');
      setDueDateTimeLocal('');
      setStatus('pendente');
    }
    setErrorMsg(null);
  }, [initialTask, defaultCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('O título da tarefa é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const due_at = dueDateTimeLocal ? fromDateTimeLocalValue(dueDateTimeLocal) : null;
      await onSave({
        title: title.trim(),
        category,
        description: description.trim(),
        due_at,
        status,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Falha ao salvar a tarefa no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <h2 id="task-modal-title" className="text-lg font-bold text-slate-900">
              {initialTask ? 'Editar Tarefa' : 'Nova Tarefa'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1" htmlFor="task-title">
              Título <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Entregar relatório de biologia"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1" htmlFor="task-category">
              Categoria
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Pessoal', 'Escolar', 'Trabalho'] as TaskCategory[]).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all min-h-[40px] ${
                    category === cat
                      ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Prazo (Data e Horário) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1" htmlFor="task-due">
              Data e Horário do Prazo (Opcional)
            </label>
            <input
              id="task-due"
              type="datetime-local"
              value={dueDateTimeLocal}
              onChange={e => setDueDateTimeLocal(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
            <p className="text-2xs text-slate-400 mt-1">
              Tarefas sem prazo nunca ficam atrasadas.
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1" htmlFor="task-description">
              Descrição (Opcional)
            </label>
            <textarea
              id="task-description"
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Adicione detalhes, links ou observações..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          {/* Status (se for edição) */}
          {initialTask && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Status
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={status === 'pendente'}
                    onChange={() => setStatus('pendente')}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <span>Pendente</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={status === 'concluida'}
                    onChange={() => setStatus('concluida')}
                    className="text-brand-600 focus:ring-brand-500"
                  />
                  <span>Concluída</span>
                </label>
              </div>
            </div>
          )}

          {/* Rodapé e Botões */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando no banco...</span>
                </>
              ) : (
                <span>Salvar Tarefa</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
