// Helpers de fecha en hora local. Formato 24 h en toda la app.
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const MINUTES_PER_DAY = 24 * 60;
export const SNAP_MIN = 15;

export const pad = n => String(n).padStart(2, '0');

export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function addMinutes(d, n) { return new Date(new Date(d).getTime() + n * 60000); }
// Semana de lunes a domingo
export function startOfWeek(d) { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); }
export function dayKey(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
export function sameDay(a, b) { return dayKey(a) === dayKey(b); }
export function minutesOfDay(d) { return d.getHours() * 60 + d.getMinutes(); }
// Google devuelve los eventos de todo el día como 'YYYY-MM-DD' (sin zona horaria)
export function parseLocalDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }

export function snap(min, step = SNAP_MIN)      { return Math.round(min / step) * step; }
export function snapFloor(min, step = SNAP_MIN) { return Math.floor(min / step) * step; }

export function fmtTime(d)          { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
export function fmtDateShort(d)     { return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()]; }
export function fmtDateTimeShort(d) { return fmtDateShort(d) + ', ' + fmtTime(d); }
export function fmtDateTime(d)      { return fmtDateShort(d) + ' ' + d.getFullYear() + ', ' + fmtTime(d); }
export function fmtRange(start, end) {
  const wd = start.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '');
  return wd + ' ' + fmtDateShort(start) + ', ' + fmtTime(start) + ' – ' + (sameDay(start, end) ? '' : fmtDateShort(end) + ', ') + fmtTime(end);
}

// Para <input type="date"> y selects de hora
export function toDateInput(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
// timeStr 'HH:mm' (acepta '24:00' = medianoche del día siguiente)
export function fromDateAndTime(dateStr, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = parseLocalDate(dateStr);
  d.setMinutes(h * 60 + m);
  return d;
}
export const TIME_OPTIONS_15 = Array.from({ length: 96 }, (_, i) => pad(Math.floor(i / 4)) + ':' + pad((i % 4) * 15));
