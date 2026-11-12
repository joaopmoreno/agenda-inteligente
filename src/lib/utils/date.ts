import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata um timestamp ISO para exibição amigável em português.
 * Ex: "Hoje às 14:00", "Amanhã às 09:30", "15 de nov. às 19:00"
 */
export function formatFriendlyDate(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = parseISO(isoString);
  if (isNaN(date.getTime())) return '';

  const timeStr = format(date, "HH:mm'h'");

  if (isToday(date)) {
    return `Hoje às ${timeStr}`;
  }
  if (isTomorrow(date)) {
    return `Amanhã às ${timeStr}`;
  }
  if (isYesterday(date)) {
    return `Ontem às ${timeStr}`;
  }

  return format(date, "d 'de' MMM. 'às' HH:mm'h'", { locale: ptBR });
}

/**
 * Formata data e hora para o valor do input datetime-local HTML (YYYY-MM-DDTHH:mm).
 */
export function toDateTimeLocalValue(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = parseISO(isoString);
  if (isNaN(date.getTime())) return '';

  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Converte valor de input datetime-local para string ISO 8601.
 */
export function fromDateTimeLocalValue(localValue: string): string | null {
  if (!localValue) return null;
  const date = new Date(localValue);
  return isNaN(date.getTime()) ? null : date.toISOString();
}
