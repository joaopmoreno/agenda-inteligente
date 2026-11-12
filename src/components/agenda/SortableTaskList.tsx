import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Task } from '../../lib/tasks/types';
import { TaskCard } from './TaskCard';

interface SortableTaskListProps {
  tasks: Task[];
  isManual: boolean;
  onReorder: (newTasks: Task[]) => void;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export const SortableTaskList: React.FC<SortableTaskListProps> = ({
  tasks,
  isManual,
  onReorder,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  // Sensores configurados para funcionar com mouse e toque (mobile e desktop)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Exige 8px de movimento para não disparar em cliques normais
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms de pressão no celular antes de iniciar o arraste (permite scroll)
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex(item => item.id === active.id);
    const newIndex = tasks.findIndex(item => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(tasks, oldIndex, newIndex);
      onReorder(reordered);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-white rounded-3xl border border-dashed border-slate-200">
        <p className="text-slate-500 text-sm font-medium">
          Nenhuma tarefa nesta categoria ainda.
        </p>
        <p className="text-slate-400 text-xs mt-1">
          Clique em "Adicionar Tarefa" ou peça para o Assistente de IA criar uma para você.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
        disabled={false}
      >
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
