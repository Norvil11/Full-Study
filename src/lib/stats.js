// Cálculos puros para la sección Estadísticas. No tocan el DOM ni Supabase:
// reciben `tasks` (y a veces un rango de fechas) y devuelven números/arreglos listos para graficar.
// Todo en hora local (helpers de dates.js), consistente con el resto de la app.
import { startOfDay, addDays, startOfWeek, dayKey, sameDay, fmtDateShort, MONTHS_SHORT } from './dates';
import { CATEGORY_CONFIG, PRIORITY_CONFIG } from './shared';

// ─── PERIODOS ─────────────────────────────────────────────────────────────────
export const PERIODS = [
  { id: 'week',    label: 'Esta semana' },
  { id: 'month',   label: 'Este mes' },
  { id: 'quarter', label: 'Últimos 3 meses' },
  { id: 'all',     label: 'Todo' },
];

// Rango [start, end) del periodo. 'all' devuelve null (sin filtro).
export function getPeriodRange(periodId, now = new Date()) {
  if (periodId === 'week') {
    const start = startOfWeek(now);
    return { start, end: addDays(start, 7) };
  }
  if (periodId === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
  if (periodId === 'quarter') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
  return null; // 'all'
}

// El periodo inmediatamente anterior, de igual duración. null si no aplica ('all').
export function getPreviousPeriodRange(periodId, now = new Date()) {
  if (periodId === 'week') { const s = addDays(startOfWeek(now), -7); return { start: s, end: addDays(s, 7) }; }
  if (periodId === 'month') { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); return { start: s, end: new Date(now.getFullYear(), now.getMonth(), 1) }; }
  if (periodId === 'quarter') { const s = new Date(now.getFullYear(), now.getMonth() - 5, 1); return { start: s, end: new Date(now.getFullYear(), now.getMonth() - 2, 1) }; }
  return null;
}

export function inRange(date, range) {
  if (!range) return true;
  const d = date instanceof Date ? date : new Date(date);
  return d >= range.start && d < range.end;
}

export function filterByCategory(tasks, category) {
  return category === 'all' ? tasks : tasks.filter(t => (t.category || 'otro') === category);
}

const isCompleted = t => t.status === 'completed' && t.completed_at;
const hasDue = t => Boolean(t.due_date);
const onTime = t => new Date(t.completed_at) <= new Date(t.due_date);

// ─── FILA 1: TARJETAS KPI ────────────────────────────────────────────────────

// % de tareas completadas EN EL PERIODO (completed_at dentro del rango) que tienen fecha
// límite y se terminaron a tiempo. Las completadas sin fecha límite no cuentan ni suman ni restan.
export function onTimeRate(tasks, range) {
  const completedInRange = tasks.filter(t => isCompleted(t) && inRange(t.completed_at, range) && hasDue(t));
  const total = completedInRange.length;
  const on = completedInRange.filter(onTime).length;
  return { onTime: on, total, pct: total > 0 ? Math.round((on / total) * 100) : null };
}

// Completadas en el periodo (completed_at dentro del rango), y en el periodo anterior equivalente.
export function completedInPeriod(tasks, range, prevRange) {
  const count = tasks.filter(t => isCompleted(t) && inRange(t.completed_at, range)).length;
  const prevCount = prevRange ? tasks.filter(t => isCompleted(t) && inRange(t.completed_at, prevRange)).length : null;
  return { count, prevCount, diff: prevCount === null ? null : count - prevCount };
}

// Vencidas ahora mismo (no depende del periodo) + cuántas de las completadas EN el periodo
// se terminaron tarde.
export function overdueNow(tasks, range, now = new Date()) {
  const count = tasks.filter(t => t.status !== 'completed' && hasDue(t) && new Date(t.due_date) < now).length;
  const lateFinished = tasks.filter(t => isCompleted(t) && inRange(t.completed_at, range) && hasDue(t) && !onTime(t)).length;
  return { count, lateFinished };
}

// Racha de días consecutivos (hasta hoy) con al menos una tarea completada, y la mejor histórica.
// No depende del periodo seleccionado: mide el hábito real, no la ventana de análisis.
export function currentStreak(tasks, now = new Date()) {
  const days = new Set(tasks.filter(isCompleted).map(t => dayKey(new Date(t.completed_at))));
  if (days.size === 0) return { current: 0, best: 0 };

  let current = 0;
  for (let d = startOfDay(now); days.has(dayKey(d)); d = addDays(d, -1)) current++;

  // Mejor racha histórica: recorre los días con actividad ordenados y cuenta tramos consecutivos.
  const sorted = [...days].map(k => { const [y, m, dd] = k.split('-').map(Number); return new Date(y, m, dd); }).sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  sorted.forEach(d => {
    run = prev && sameDay(addDays(prev, 1), d) ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  });
  return { current, best: Math.max(best, current) };
}

// ─── FILA 2: GRÁFICOS ─────────────────────────────────────────────────────────

// Completadas por semana (últimas `weeks` semanas, incluida la actual), apiladas por categoría,
// con el % a tiempo de cada semana. No depende del periodo seleccionado (ventana fija de 8 semanas).
export function weeklyCompletion(tasks, weeks = 8, now = new Date()) {
  const thisWeekStart = startOfWeek(now);
  const cats = Object.keys(CATEGORY_CONFIG);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisWeekStart, -7 * (weeks - 1 - i));
    const end = addDays(start, 7);
    const inWeek = tasks.filter(t => isCompleted(t) && inRange(t.completed_at, { start, end }));
    const row = { label: fmtDateShort(start), start };
    cats.forEach(c => { row[c] = inWeek.filter(t => (t.category || 'otro') === c).length; });
    const withDue = inWeek.filter(hasDue);
    row.onTimePct = withDue.length > 0 ? Math.round((withDue.filter(onTime).length / withDue.length) * 100) : null;
    return row;
  });
}

// Pendientes que vencen cada uno de los próximos `days` días (incluye hoy), por prioridad.
// No depende del periodo seleccionado: es "lo que se viene" desde hoy.
export function upcomingLoad(tasks, days = 7, now = new Date()) {
  const today = startOfDay(now);
  const prios = Object.keys(PRIORITY_CONFIG);
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(today, i);
    const due = tasks.filter(t => t.status !== 'completed' && hasDue(t) && sameDay(new Date(t.due_date), day));
    const row = { label: day.getDate() + ' ' + MONTHS_SHORT[day.getMonth()], date: day, total: due.length };
    prios.forEach(p => { row[p] = due.filter(t => (t.priority || 'medium') === p).length; });
    return row;
  });
}

// ─── FILA 3 ───────────────────────────────────────────────────────────────────

// Tareas por categoría en el periodo (por created_at, ya que representa "qué se generó/trabajó").
export function categoryDistribution(tasks, range) {
  const inPeriod = tasks.filter(t => inRange(t.created_at, range));
  return Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => ({
    key, label: cfg.label, color: cfg.color,
    count: inPeriod.filter(t => (t.category || 'otro') === key).length,
  }));
}

// Horas programadas (scheduled_end - scheduled_start) por categoría, para bloques cuyo inicio
// cae en el periodo.
export function categoryHours(tasks, range) {
  const scheduled = tasks.filter(t => t.scheduled_start && t.scheduled_end && inRange(t.scheduled_start, range));
  return Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
    const hours = scheduled
      .filter(t => (t.category || 'otro') === key)
      .reduce((sum, t) => sum + (new Date(t.scheduled_end) - new Date(t.scheduled_start)) / 3600000, 0);
    return { key, label: cfg.label, color: cfg.color, hours };
  });
}

// Pendientes (no completadas) por prioridad. Instantánea actual, no depende del periodo.
export function pendingByPriority(tasks) {
  const pending = tasks.filter(t => t.status !== 'completed');
  return Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => ({
    key, label: cfg.label, color: cfg.color,
    count: pending.filter(t => (t.priority || 'medium') === key).length,
  }));
}

// ─── FILA 4: HÁBITOS ──────────────────────────────────────────────────────────

// Margen promedio = due_date - completed_at, para completadas EN EL PERIODO con fecha límite
// (incluye las tardías, por eso puede salir negativo → "retraso promedio").
export function avgMargin(tasks, range) {
  const withDue = tasks.filter(t => isCompleted(t) && inRange(t.completed_at, range) && hasDue(t));
  if (withDue.length === 0) return { minutes: null, count: 0 };
  const totalMin = withDue.reduce((sum, t) => sum + (new Date(t.due_date) - new Date(t.completed_at)) / 60000, 0);
  return { minutes: totalMin / withDue.length, count: withDue.length };
}

// Tiempo promedio de resolución = completed_at - created_at, para completadas EN EL PERIODO.
export function avgResolutionTime(tasks, range) {
  const completed = tasks.filter(t => isCompleted(t) && inRange(t.completed_at, range));
  if (completed.length === 0) return { minutes: null, count: 0 };
  const totalMin = completed.reduce((sum, t) => sum + (new Date(t.completed_at) - new Date(t.created_at)) / 60000, 0);
  return { minutes: totalMin / completed.length, count: completed.length };
}

// % de pendientes con fecha límite que ya tienen horario asignado. Instantánea actual.
export function planningRate(tasks) {
  const pendingWithDue = tasks.filter(t => t.status !== 'completed' && hasDue(t));
  const scheduled = pendingWithDue.filter(t => t.scheduled_start).length;
  const total = pendingWithDue.length;
  return { scheduled, total, pct: total > 0 ? Math.round((scheduled / total) * 100) : null };
}

// Ocupación de la semana actual: horas ya comprometidas (Google + tareas programadas) frente
// a las horas disponibles de la ventana [windowStartHour, windowEndHour) de cada día de la semana.
// taskBlocks / googleBlocks: arreglos de { start: Date, end: Date }.
export function weeklyOccupancy(taskBlocks, googleBlocks, now = new Date(), windowStartHour = 7, windowEndHour = 22) {
  const weekStart = startOfWeek(now);
  const overlapHours = (blocks) => {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const winStart = new Date(day); winStart.setHours(windowStartHour, 0, 0, 0);
      const winEnd = new Date(day); winEnd.setHours(windowEndHour, 0, 0, 0);
      blocks.forEach(b => {
        const s = Math.max(b.start.getTime(), winStart.getTime());
        const e = Math.min(b.end.getTime(), winEnd.getTime());
        if (e > s) total += (e - s) / 3600000;
      });
    }
    return total;
  };
  const availableHours = 7 * (windowEndHour - windowStartHour);
  const taskHours = overlapHours(taskBlocks);
  const googleHours = overlapHours(googleBlocks);
  const busy = Math.min(availableHours, taskHours + googleHours);
  return { taskHours, googleHours, availableHours, freeHours: Math.max(0, availableHours - busy) };
}

// ─── FORMATO ──────────────────────────────────────────────────────────────────

// minutos (con signo) → "1 día 4 h antes" / "3 h 20 min" / "2 h antes" etc.
export function formatDuration(minutes, { pastLabel = 'antes', futureLabel = 'después' } = {}) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '—';
  const sign = minutes < 0 ? -1 : 1;
  let m = Math.round(Math.abs(minutes));
  const days = Math.floor(m / 1440); m -= days * 1440;
  const hours = Math.floor(m / 60); m -= hours * 60;
  const parts = [];
  if (days > 0) parts.push(days + ' día' + (days > 1 ? 's' : ''));
  if (hours > 0) parts.push(hours + ' h');
  if (days === 0 && hours === 0) parts.push((m || 0) + ' min');
  else if (m > 0 && days === 0) parts.push(m + ' min');
  return parts.join(' ') + ' ' + (sign > 0 ? pastLabel : futureLabel);
}

// minutos (sin signo, para duraciones) → "1 día 4 h" / "45 min"
export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '—';
  let m = Math.round(Math.abs(minutes));
  const days = Math.floor(m / 1440); m -= days * 1440;
  const hours = Math.floor(m / 60); m -= hours * 60;
  const parts = [];
  if (days > 0) parts.push(days + ' día' + (days > 1 ? 's' : ''));
  if (hours > 0) parts.push(hours + ' h');
  if (days === 0) parts.push(m + ' min');
  return parts.join(' ');
}
