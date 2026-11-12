import { Task } from './types';

/**
 * Determina se uma tarefa está atrasada.
 * Regra estrita: Uma tarefa fica atrasada SOMENTE quando tem prazo,
 * o prazo passou (anterior ao momento de referência) e seu status é 'pendente'.
 * Tarefas sem prazo NUNCA ficam atrasadas.
 * Tarefas concluídas NUNCA ficam atrasadas.
 */
export function isTaskOverdue(task: Task, referenceDate: Date = new Date()): boolean {
  if (task.status === 'concluida') return false;
  if (!task.due_at) return false;

  const dueTime = new Date(task.due_at).getTime();
  if (isNaN(dueTime)) return false;

  return dueTime < referenceDate.getTime();
}

/**
 * Determina se uma tarefa tem prazo próximo (nas próximas N horas, padrão 48h).
 * Aplica-se somente se a tarefa for pendente e não estiver atrasada.
 */
export function isTaskDueSoon(
  task: Task,
  referenceDate: Date = new Date(),
  windowHours: number = 48
): boolean {
  if (task.status === 'concluida') return false;
  if (!task.due_at) return false;

  const dueTime = new Date(task.due_at).getTime();
  if (isNaN(dueTime)) return false;

  const nowTime = referenceDate.getTime();
  const windowEnd = nowTime + windowHours * 60 * 60 * 1000;

  // Está dentro da janela futura: entre agora e agora + windowHours
  return dueTime >= nowTime && dueTime <= windowEnd;
}

/**
 * Determina se a tarefa vence hoje, respeitando o fuso horário especificado.
 */
export function isTaskDueToday(
  task: Task,
  referenceDate: Date = new Date(),
  timezone: string = 'America/Sao_Paulo'
): boolean {
  if (!task.due_at) return false;

  const dueDate = new Date(task.due_at);
  if (isNaN(dueDate.getTime())) return false;

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const dueDay = formatter.format(dueDate);
    const refDay = formatter.format(referenceDate);

    return dueDay === refDay;
  } catch {
    // Fallback caso fuso horário seja inválido
    return dueDate.toDateString() === referenceDate.toDateString();
  }
}

/**
 * Ordenação Automática:
 * 1. Tarefas atrasadas aparecem primeiro (ordenadas pelo prazo mais antigo primeiro).
 * 2. Depois aparecem as tarefas pendentes ordenadas pelo prazo mais próximo.
 * 3. Tarefas sem prazo aparecem em seguida.
 * 4. Tarefas concluídas aparecem por último (nunca tratadas como atrasadas).
 */
export function sortTasksAutomatically(
  tasks: Task[],
  referenceDate: Date = new Date()
): Task[] {
  const overdue: Task[] = [];
  const pendingWithDue: Task[] = [];
  const pendingNoDue: Task[] = [];
  const completed: Task[] = [];

  for (const task of tasks) {
    if (task.status === 'concluida') {
      completed.push(task);
    } else if (isTaskOverdue(task, referenceDate)) {
      overdue.push(task);
    } else if (task.due_at) {
      pendingWithDue.push(task);
    } else {
      pendingNoDue.push(task);
    }
  }

  // Ordena atrasadas pelo prazo mais antigo primeiro (urgência maior)
  overdue.sort((a, b) => {
    const timeA = new Date(a.due_at!).getTime();
    const timeB = new Date(b.due_at!).getTime();
    return timeA - timeB;
  });

  // Ordena pendentes no prazo pelo prazo mais próximo
  pendingWithDue.sort((a, b) => {
    const timeA = new Date(a.due_at!).getTime();
    const timeB = new Date(b.due_at!).getTime();
    return timeA - timeB;
  });

  // Ordena sem prazo por data de criação decrescente
  pendingNoDue.sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Concluídas por data de atualização/conclusão decrescente
  completed.sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return [...overdue, ...pendingWithDue, ...pendingNoDue, ...completed];
}

/**
 * Ordenação Manual:
 * Ordena estritamente com base no valor de `sort_order` crescente.
 */
export function sortTasksManually(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}
