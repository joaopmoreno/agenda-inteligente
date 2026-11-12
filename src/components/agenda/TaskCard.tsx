import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Task } from '../../lib/tasks/types';
import { isTaskOverdue, isTaskDueSoon } from '../../lib/tasks/logic';
import { formatFriendlyDate } from '../../lib/utils/date';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isCompleted = task.status === 'concluida';
  const isOverdue = isTaskOverdue(task);
  const isDueSoon = isTaskDueSoon(task);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-xs hover:shadow-md flex items-start gap-3 sm:gap-4 ${
        isCompleted
          ? 'border-slate-200 bg-slate-50/60 opacity-75'
          : isOverdue
          ? 'border-rose-200 bg-rose-50/20'
          : 'border-slate-200'
      }`}
    >
      {/* Alça de Arraste (Drag Handle) */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded-md touch-none min-h-[36px] min-w-[28px] flex items-center justify-center"
        aria-label="Arrastar tarefa para reordenar"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Botão de Concluir (Checkbox) */}
      <button
        type="button"
        onClick={() => onToggleComplete(task)}
        className="mt-0.5 text-slate-400 hover:text-brand-600 transition-colors flex-shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
        aria-label={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-brand-600 fill-brand-50" />
        ) : (
          <Circle className="w-5 h-5 hover:stroke-brand-600" />
        )}
      </button>

      {/* Conteúdo Principal */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              task.category === 'Pessoal'
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : task.category === 'Escolar'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}
          >
            {task.category}
          </span>

          {/* Selos de Alerta de Prazo */}
          {isOverdue && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              Atrasada
            </span>
          )}

          {!isOverdue && isDueSoon && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              <Clock className="w-3 h-3 text-amber-600" />
              Prazo próximo
            </span>
          )}
        </div>

        <h3
          className={`text-base font-semibold text-slate-800 leading-snug break-words ${
            isCompleted ? 'line-through text-slate-400 font-normal' : ''
          }`}
        >
          {task.title}
        </h3>

        {task.description && (
          <p
            className={`text-sm text-slate-600 mt-1 line-clamp-2 leading-relaxed ${
              isCompleted ? 'text-slate-400' : ''
            }`}
          >
            {task.description}
          </p>
        )}

        {/* Informações de Prazo */}
        {task.due_at && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className={isOverdue ? 'text-rose-600 font-semibold' : ''}>
              Prazo: {formatFriendlyDate(task.due_at)}
            </span>
          </div>
        )}
      </div>

      {/* Ações (Editar e Excluir) */}
      <div className="flex items-center gap-1 flex-shrink-0 self-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="Editar tarefa"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="Excluir tarefa"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
