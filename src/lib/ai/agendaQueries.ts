import { isTaskDueSoon, isTaskOverdue } from '../tasks/logic';
import { taskRepository } from '../tasks/repository';

export const upcomingQuestion = 'O que tenho para fazer nas próximas 48 horas?';
export const overdueQuestion = 'Quais tarefas estão atrasadas?';

function normalize(question: string) {
  return question.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[?!.]+$/, '').trim().replace(/\s+/g, ' ');
}

export async function answerAgendaQuestion(question: string, userId: string, timezone: string, now: Date) {
  const query = normalize(question.trim());
  const upcoming = query === normalize(upcomingQuestion);
  if (!upcoming && query !== normalize(overdueQuestion)) return null;

  const tasks = (await taskRepository.listTasks(userId))
    .filter(task => upcoming ? isTaskDueSoon(task, now) : isTaskOverdue(task, now))
    .sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!));
  if (!tasks.length) return upcoming
    ? 'Você não tem tarefas pendentes com prazo nas próximas 48 horas.'
    : 'Você não tem tarefas atrasadas.';

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone || 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
  });
  const heading = upcoming ? 'Tarefas que vencem nas próximas 48 horas' : 'Tarefas atrasadas';
  return [heading, ...tasks.map(task =>
    `• ${task.title} (${task.category}) — ${formatter.format(new Date(task.due_at!))}`
  )].join('\n');
}
