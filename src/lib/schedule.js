// Reglas para programar bloques de trabajo de una tarea en el calendario.
import { fmtDateShort, fmtTime } from './dates';

export const DEADLINE_MARGIN_MS = 4 * 60 * 60 * 1000; // el bloque debe terminar 4 h antes de la fecha límite

// Último instante en que puede terminar un bloque (null = sin fecha límite)
export function scheduleLimit(task) {
  return task.due_date ? new Date(new Date(task.due_date).getTime() - DEADLINE_MARGIN_MS) : null;
}

// ¿Queda algún hueco válido para programarla?
export function canStillSchedule(task, now = new Date()) {
  const limit = scheduleLimit(task);
  return !limit || now < limit;
}

// Devuelve un mensaje de error o null si el bloque es válido.
// startChanged=false (solo se estiró el bloque): se permite que el inicio ya esté en el pasado.
export function validateSchedule(task, start, end, { now = new Date(), startChanged = true } = {}) {
  if (startChanged ? start < now : end <= now) return 'No puedes programar una tarea en el pasado.';
  const limit = scheduleLimit(task);
  if (limit && end > limit) {
    const due = new Date(task.due_date);
    return 'Debes programar esta tarea al menos 4 h antes de su fecha límite (vence el ' + fmtDateShort(due) + ' a las ' + fmtTime(due) + ').';
  }
  return null;
}
