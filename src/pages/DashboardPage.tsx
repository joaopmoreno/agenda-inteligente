import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  AlertTriangle,
  Plus,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useAssistant } from '../contexts/AssistantContext';
import { taskRepository } from '../lib/tasks/repository';
import { NewTaskInput } from '../lib/tasks/types';
import { isTaskOverdue, isTaskDueSoon, isTaskDueToday } from '../lib/tasks/logic';
import { StatCard } from '../components/dashboard/StatCard';
import { TaskModal } from '../components/agenda/TaskModal';
import { formatFriendlyDate } from '../lib/utils/date';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toggleAssistant } = useAssistant();
  const queryClient = useQueryClient();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const timezone = profile?.timezone || 'America/Sao_Paulo';

  // Consulta ao banco permanente de tarefas
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => (user ? taskRepository.listTasks(user.id) : Promise.resolve([])),
    enabled: Boolean(user?.id),
  });

  // Mutação para alternar conclusão diretamente do painel
  const toggleCompleteMutation = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      taskRepository.completeTask(user!.id, taskId, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Mutação para criar tarefa
  const createTaskMutation = useMutation({
    mutationFn: (input: NewTaskInput) => taskRepository.createTask(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  // Filtragem estrita usando as regras de negócio puras
  const overdueTasks = tasks.filter(t => isTaskOverdue(t, now));
  const dueSoonTasks = tasks.filter(t => isTaskDueSoon(t, now, 48));
  const todayTasks = tasks.filter(t => isTaskDueToday(t, now, timezone));
  const pendingTodayTasks = todayTasks.filter(t => t.status === 'pendente');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Boas-vindas e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Olá, {profile?.name || user?.email?.split('@')[0]}!
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsTaskModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold rounded-xl text-sm shadow-xs transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Tarefa</span>
          </button>

          <button
            type="button"
            onClick={toggleAssistant}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm shadow-xs transition-all min-h-[44px]"
          >
            <Sparkles className="w-4 h-4 text-brand-300" />
            <span>Assistente</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Tarefas"
          count={dueSoonTasks.length}
          description="Com prazo nas próximas 48 horas"
          icon={Clock}
          variant="emerald"
        />
        <StatCard
          title="Tarefas de Hoje"
          count={todayTasks.length}
          description={`${pendingTodayTasks.length} pendentes`}
          icon={Calendar}
          variant="amber"
        />
        <StatCard
          title="Tarefas Atrasadas"
          count={overdueTasks.length}
          description={overdueTasks.length > 0 ? 'Exige atenção' : 'Tudo em dia'}
          icon={AlertTriangle}
          variant="rose"
        />
      </div>

      {/* Atalho para a Agenda Completa */}
      <div className="p-4 bg-gradient-to-r from-brand-600 to-teal-700 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Abra sua Agenda por Categorias</h2>
          <p className="text-xs text-brand-100">
            Acesse as abas Pessoal, Escolar e Trabalho com ordenação manual por arraste ou automática.
          </p>
        </div>
        <Link
          to="/agenda"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-brand-700 font-semibold rounded-xl text-xs hover:bg-brand-50 transition-colors shadow-2xs min-h-[38px]"
        >
          <span>Abrir Agenda</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Seção: Tarefas de Hoje */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tarefas de Hoje</h2>
          </div>
          <Link
            to="/agenda"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600 mb-2" />
            <span className="text-xs">Carregando tarefas do banco...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
            {(error as Error).message || 'Erro ao consultar tarefas.'}
          </div>
        ) : todayTasks.length === 0 ? (
          <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm">
            Nenhuma tarefa com prazo para hoje. Bom descanso ou aproveite para adiantar tarefas!
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayTasks.map(task => {
              const isCompleted = task.status === 'concluida';
              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isCompleted
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        toggleCompleteMutation.mutate({
                          taskId: task.id,
                          completed: !isCompleted,
                        })
                      }
                      className="text-slate-400 hover:text-brand-600"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-brand-600 fill-brand-50" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <span
                        className={`text-sm font-semibold text-slate-800 block truncate ${
                          isCompleted ? 'line-through text-slate-400 font-normal' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{task.category}</span>
                        {task.due_at && (
                          <>
                            <span>•</span>
                            <span>{formatFriendlyDate(task.due_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seção: Tarefas Atrasadas (quando houver) */}
      {overdueTasks.length > 0 && (
        <div className="bg-rose-50/50 border-l-4 border-l-red-600 border border-rose-200/80 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h2>Tarefas Atrasadas ({overdueTasks.length})</h2>
          </div>
          <div className="space-y-2.5">
            {overdueTasks.map(task => (
              <div
                key={task.id}
                className="bg-white p-4 rounded-xl border border-rose-200 border-l-4 border-l-red-600 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      toggleCompleteMutation.mutate({
                        taskId: task.id,
                        completed: task.status !== 'concluida',
                      })
                    }
                    className="text-slate-400 hover:text-brand-600"
                  >
                    <Circle className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-slate-800 truncate block">
                      {task.title}
                    </span>
                    <span className="text-xs text-rose-600 font-medium">
                      Prazo venceu em {formatFriendlyDate(task.due_at)} ({task.category})
                    </span>
                  </div>
                </div>
                <Link
                  to="/agenda"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 whitespace-nowrap"
                >
                  Ver na Agenda
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Criação de Tarefa */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={async data => {
          await createTaskMutation.mutateAsync(data);
        }}
        defaultCategory="Pessoal"
      />
    </div>
  );
};
