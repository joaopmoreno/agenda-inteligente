import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAssistant } from '../contexts/AssistantContext';
import { taskRepository } from '../lib/tasks/repository';
import { Task, TaskCategory, SortMode, NewTaskInput } from '../lib/tasks/types';
import { sortTasksAutomatically, sortTasksManually } from '../lib/tasks/logic';
import { AgendaTabs } from '../components/agenda/AgendaTabs';
import { SortableTaskList } from '../components/agenda/SortableTaskList';
import { TaskModal } from '../components/agenda/TaskModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const AgendaPage: React.FC = () => {
  const { user } = useAuth();
  const { setActiveCategory, toggleAssistant } = useAssistant();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTabState] = useState<TaskCategory>('Pessoal');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Sincroniza a categoria ativa com o contexto do assistente
  const setActiveTab = (tab: TaskCategory) => {
    setActiveTabState(tab);
    setActiveCategory(tab);
  };

  useEffect(() => {
    setActiveCategory(activeTab);
  }, [activeTab, setActiveCategory]);

  // Consulta todas as tarefas do usuário
  const { data: allTasks = [], isLoading: isLoadingTasks, error: tasksError } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => (user ? taskRepository.listTasks(user.id) : Promise.resolve([])),
    enabled: Boolean(user?.id),
  });

  // Consulta preferências de ordenação por categoria
  const { data: categorySettings = { Pessoal: 'automatico', Escolar: 'automatico', Trabalho: 'automatico' } } = useQuery({
    queryKey: ['category_settings', user?.id],
    queryFn: () => (user ? taskRepository.getCategorySettings(user.id) : Promise.resolve({ Pessoal: 'automatico', Escolar: 'automatico', Trabalho: 'automatico' } as Record<TaskCategory, SortMode>)),
    enabled: Boolean(user?.id),
  });

  const currentSortMode: SortMode = categorySettings[activeTab] || 'automatico';

  // Contagem por categoria
  const taskCounts: Record<TaskCategory, number> = {
    Pessoal: allTasks.filter(t => t.category === 'Pessoal').length,
    Escolar: allTasks.filter(t => t.category === 'Escolar').length,
    Trabalho: allTasks.filter(t => t.category === 'Trabalho').length,
  };

  // Tarefas da aba atual
  const categoryTasks = allTasks.filter(t => t.category === activeTab);

  // Ordenação de acordo com o modo
  const displayedTasks =
    currentSortMode === 'automatico'
      ? sortTasksAutomatically(categoryTasks, new Date())
      : sortTasksManually(categoryTasks);

  // Mutações
  const saveSortModeMutation = useMutation({
    mutationFn: ({ category, mode }: { category: TaskCategory; mode: SortMode }) =>
      taskRepository.saveCategorySetting(user!.id, category, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_settings'] });
    },
  });

  const saveBatchSortOrderMutation = useMutation({
    mutationFn: ({ category, items }: { category: TaskCategory; items: { id: string; sort_order: number }[] }) =>
      taskRepository.updateSortOrders(user!.id, category, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) =>
      taskRepository.completeTask(user!.id, taskId, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (input: NewTaskInput) => {
      if (editingTask) {
        return taskRepository.updateTask(user!.id, editingTask.id, input);
      }
      return taskRepository.createTask(user!.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsTaskModalOpen(false);
      setEditingTask(null);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => taskRepository.deleteTask(user!.id, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeletingTask(null);
    },
  });

  // Handler de reordenação por arraste (@dnd-kit)
  const handleReorder = async (reorderedTasks: Task[]) => {
    // Se estava em automático e o usuário arrastou, passa a aba para manual!
    if (currentSortMode === 'automatico') {
      await saveSortModeMutation.mutateAsync({ category: activeTab, mode: 'manual' });
    }

    // Calcula novos sort_order com espaçamento de 10
    const items = reorderedTasks.map((task, index) => ({
      id: task.id,
      sort_order: (index + 1) * 10,
    }));

    await saveBatchSortOrderMutation.mutateAsync({ category: activeTab, items });
  };

  const handleSortModeToggle = async (mode: SortMode) => {
    await saveSortModeMutation.mutateAsync({ category: activeTab, mode });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Topo da Agenda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Agenda
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize suas tarefas em abas dedicadas e gerencie a ordem com flexibilidade.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold rounded-xl text-sm shadow-xs transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Tarefa</span>
          </button>

          <button
            type="button"
            onClick={toggleAssistant}
            aria-label="Assistente"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm shadow-xs transition-all min-h-[44px]"
          >
            <Sparkles className="w-4 h-4 text-brand-300" />
            <span className="hidden sm:inline">Assistente</span>
          </button>
        </div>
      </div>

      {/* Abas e Modo de Ordenação */}
      <AgendaTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sortMode={currentSortMode}
        onSortModeChange={handleSortModeToggle}
        taskCounts={taskCounts}
      />

      {/* Status do Modo de Ordenação */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Modo atual:{' '}
          <strong className="text-slate-700 capitalize">{currentSortMode}</strong>
          {currentSortMode === 'automatico'
            ? ' (Atrasadas primeiro, depois por prazo mais próximo)'
            : ' (Arraste os cartões para reposicionar)'}
        </span>
      </div>

      {/* Lista de Tarefas com Suporte a Drag & Drop */}
      {isLoadingTasks ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
          <p className="text-sm">Carregando tarefas da categoria {activeTab}...</p>
        </div>
      ) : tasksError ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{(tasksError as Error).message || 'Erro ao carregar tarefas do banco.'}</span>
        </div>
      ) : (
        <SortableTaskList
          tasks={displayedTasks}
          isManual={currentSortMode === 'manual'}
          onReorder={handleReorder}
          onToggleComplete={task =>
            toggleCompleteMutation.mutate({
              taskId: task.id,
              completed: task.status !== 'concluida',
            })
          }
          onEdit={task => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDelete={task => setDeletingTask(task)}
        />
      )}

      {/* Modal de Criação / Edição */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={async data => {
          await saveTaskMutation.mutateAsync(data);
        }}
        initialTask={editingTask}
        defaultCategory={activeTab}
      />

      {/* Diálogo de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={Boolean(deletingTask)}
        title="Excluir Tarefa"
        message={`Tem certeza que deseja excluir a tarefa "${deletingTask?.title}"? Esta ação removerá a tarefa definitivamente do banco de dados.`}
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        isLoading={deleteTaskMutation.isPending}
        onConfirm={() => {
          if (deletingTask) {
            deleteTaskMutation.mutate(deletingTask.id);
          }
        }}
        onCancel={() => setDeletingTask(null)}
      />
    </div>
  );
};
