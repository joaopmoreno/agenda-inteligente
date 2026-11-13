import { describe, it, expect } from 'vitest';
import {
  isTaskOverdue,
  isTaskDueSoon,
  isTaskDueToday,
  sortTasksAutomatically,
  sortTasksManually,
} from './logic';
import { Task } from './types';

function createMockTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    category: 'Pessoal',
    title: 'Tarefa de Teste',
    description: null,
    due_at: null,
    status: 'pendente',
    sort_order: 0,
    created_at: new Date('2026-11-01T10:00:00Z').toISOString(),
    updated_at: new Date('2026-11-01T10:00:00Z').toISOString(),
    ...overrides,
  };
}

describe('Lógica de Prazos e Atrasos (src/lib/tasks/logic.ts)', () => {
  const referenceNow = new Date('2026-11-12T12:00:00Z');

  it('deve identificar como atrasada uma tarefa pendente cujo prazo já passou', () => {
    const overdueTask = createMockTask({
      title: 'Tarefa Atrasada',
      due_at: '2026-11-12T10:00:00Z', // 2 horas atrás
      status: 'pendente',
    });

    expect(isTaskOverdue(overdueTask, referenceNow)).toBe(true);
  });

  it('não deve considerar atrasada uma tarefa pendente dentro do prazo', () => {
    const futureTask = createMockTask({
      title: 'Tarefa Futura',
      due_at: '2026-11-12T15:00:00Z', // 3 horas no futuro
      status: 'pendente',
    });

    expect(isTaskOverdue(futureTask, referenceNow)).toBe(false);
  });

  it('nunca deve considerar atrasada uma tarefa sem prazo', () => {
    const noDueTask = createMockTask({
      title: 'Sem prazo definido',
      due_at: null,
      status: 'pendente',
    });

    expect(isTaskOverdue(noDueTask, referenceNow)).toBe(false);
  });

  it('nunca deve considerar atrasada uma tarefa concluída com prazo passado', () => {
    const completedTask = createMockTask({
      title: 'Tarefa Concluída no passado',
      due_at: '2026-11-10T10:00:00Z',
      status: 'concluida',
    });

    expect(isTaskOverdue(completedTask, referenceNow)).toBe(false);
  });

  it('deve identificar se a tarefa está com prazo próximo (nas próximas 48 horas)', () => {
    const taskIn24h = createMockTask({
      title: 'Em 24h',
      due_at: '2026-11-13T12:00:00Z',
      status: 'pendente',
    });

    const taskIn72h = createMockTask({
      title: 'Em 72h',
      due_at: '2026-11-15T12:00:00Z',
      status: 'pendente',
    });

    expect(isTaskDueSoon(taskIn24h, referenceNow, 48)).toBe(true);
    expect(isTaskDueSoon(taskIn72h, referenceNow, 48)).toBe(false);
  });

  it('deve identificar se a tarefa vence hoje respeitando o fuso horário', () => {
    const taskToday = createMockTask({
      title: 'Hoje em SP',
      due_at: '2026-11-12T20:00:00Z', // mesmo dia
    });

    const taskTomorrow = createMockTask({
      title: 'Amanhã',
      due_at: '2026-11-13T20:00:00Z',
    });

    expect(isTaskDueToday(taskToday, referenceNow, 'America/Sao_Paulo')).toBe(true);
    expect(isTaskDueToday(taskTomorrow, referenceNow, 'America/Sao_Paulo')).toBe(false);
  });
});

describe('Ordenação Automática de Tarefas', () => {
  const referenceNow = new Date('2026-11-12T12:00:00Z');

  it('deve ordenar: atrasadas primeiro -> pendentes por prazo -> sem prazo -> concluídas', () => {
    const tOverdue1 = createMockTask({
      id: 't-overdue-1',
      title: 'Atrasada Mais Antiga',
      due_at: '2026-11-11T10:00:00Z',
      status: 'pendente',
    });

    const tOverdue2 = createMockTask({
      id: 't-overdue-2',
      title: 'Atrasada Recente',
      due_at: '2026-11-12T08:00:00Z',
      status: 'pendente',
    });

    const tUpcomingSoon = createMockTask({
      id: 't-upcoming-soon',
      title: 'Prazo Próximo',
      due_at: '2026-11-12T15:00:00Z',
      status: 'pendente',
    });

    const tUpcomingLater = createMockTask({
      id: 't-upcoming-later',
      title: 'Prazo Distante',
      due_at: '2026-11-14T10:00:00Z',
      status: 'pendente',
    });

    const tNoDue = createMockTask({
      id: 't-no-due',
      title: 'Sem Prazo',
      due_at: null,
      status: 'pendente',
    });

    const tCompleted = createMockTask({
      id: 't-completed',
      title: 'Concluída (com prazo passado)',
      due_at: '2026-11-10T10:00:00Z',
      status: 'concluida',
    });

    // Ordem de entrada misturada
    const unsorted = [
      tCompleted,
      tUpcomingLater,
      tNoDue,
      tOverdue2,
      tUpcomingSoon,
      tOverdue1,
    ];

    const sorted = sortTasksAutomatically(unsorted, referenceNow);

    expect(sorted.map(t => t.id)).toEqual([
      't-overdue-1',      // Atrasada mais antiga
      't-overdue-2',      // Atrasada recente
      't-upcoming-soon',  // Prazo mais próximo
      't-upcoming-later', // Prazo mais distante
      't-no-due',         // Sem prazo
      't-completed',      // Concluída por último
    ]);
  });
});

describe('Ordenação Manual de Tarefas', () => {
  it('deve ordenar estritamente pelos valores de sort_order crescente', () => {
    const tA = createMockTask({ id: 't-a', title: 'Task A', sort_order: 30 });
    const tB = createMockTask({ id: 't-b', title: 'Task B', sort_order: 10 });
    const tC = createMockTask({ id: 't-c', title: 'Task C', sort_order: 20 });

    const sorted = sortTasksManually([tA, tB, tC]);

    expect(sorted.map(t => t.id)).toEqual(['t-b', 't-c', 't-a']);
  });
});

it('exclui pendências vencidas hoje da contagem de hoje, inclusive logo após o prazo', () => {
  const deadline = '2026-11-12T14:00:00.000Z';
  const task = createMockTask({due_at:deadline});
  const now = new Date(Date.parse(deadline)+1);
  expect(isTaskOverdue(task,now)).toBe(true);
  expect(isTaskDueToday(task,now,'America/Sao_Paulo')).toBe(false);
  expect(isTaskDueSoon(task,now)).toBe(false);
  expect(isTaskDueToday(task,new Date(deadline),'America/Sao_Paulo')).toBe(true);
});
