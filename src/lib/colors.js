// Paleta de colores de eventos (como Google Calendar) y utilidades de contraste.
// Único lugar donde se definen estos colores: los componentes deben usar estas funciones.
import { useSyncExternalStore } from 'react';
import { CATEGORY_CONFIG } from './shared';

// Tonos de la interfaz actual de Google Calendar por colorId.
// (GET /colors devuelve la paleta antigua —#a4bdfc, #7ae7bf…—, por eso se dibuja con estos
//  tonos y la API solo se usa para saber qué ids existen.)
export const EVENT_COLORS = {
  '1':  { name: 'Lavanda',   hex: '#7986CB' },
  '2':  { name: 'Salvia',    hex: '#33B679' },
  '3':  { name: 'Uva',       hex: '#8E24AA' },
  '4':  { name: 'Flamenco',  hex: '#E67C73' },
  '5':  { name: 'Plátano',   hex: '#F6BF26' },
  '6':  { name: 'Mandarina', hex: '#F4511E' },
  '7':  { name: 'Pavo real', hex: '#039BE5' },
  '8':  { name: 'Grafito',   hex: '#616161' },
  '9':  { name: 'Arándano',  hex: '#3F51B5' },
  '10': { name: 'Albahaca',  hex: '#0B8043' },
  '11': { name: 'Tomate',    hex: '#D50000' },
};
export const COLOR_IDS = Object.keys(EVENT_COLORS);
export const DEFAULT_CALENDAR_COLOR = '#039BE5'; // si no se puede leer el color del calendario principal
export const TEXT_DARK  = '#1F1F1F';
export const TEXT_LIGHT = '#FFFFFF';

// ─── Store (paleta obtenida de Google) ───────────────────────────────────────
let state = { colorIds: COLOR_IDS, apiColors: null, calendarColor: DEFAULT_CALENDAR_COLOR };
const listeners = new Set();
const emit = () => listeners.forEach(l => l());

// eventColors: objeto "event" de GET /colors; calendarColor: backgroundColor del calendario principal
export function setGoogleColors({ eventColors, calendarColor }) {
  state = {
    colorIds: eventColors ? Object.keys(eventColors).sort((a, b) => a - b) : state.colorIds,
    apiColors: eventColors || state.apiColors,
    calendarColor: calendarColor || state.calendarColor,
  };
  emit();
}
export function resetGoogleColors() {
  state = { colorIds: COLOR_IDS, apiColors: null, calendarColor: DEFAULT_CALENDAR_COLOR };
  emit();
}
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export function usePalette() { return useSyncExternalStore(subscribe, () => state); }

// ─── Colores → hex ───────────────────────────────────────────────────────────
export function colorHex(colorId) {
  if (!colorId) return null;
  return EVENT_COLORS[colorId]?.hex || state.apiColors?.[colorId]?.background || null;
}
export function colorName(colorId) { return EVENT_COLORS[colorId]?.name || 'Color ' + colorId; }

export function categoryColor(category) { return (CATEGORY_CONFIG[category] || CATEGORY_CONFIG.otro).color; }

// Evento de Google: su colorId o, si no tiene, el color del calendario principal
export function eventColor(ev) { return colorHex(ev.colorId) || state.calendarColor; }

// Tarea: color personalizado o el de su categoría
export function taskColor(task) { return colorHex(task.color_id) || categoryColor(task.category); }

// colorId que se envía al evento "📌" de la tarea
export function taskColorIdForGoogle(task) { return task.color_id || nearestColorId(categoryColor(task.category)); }

// ─── Contraste y tonos ───────────────────────────────────────────────────────
function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (rgb) => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

// Luminancia relativa (WCAG), 0 = negro, 1 = blanco
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Texto blanco sobre fondos oscuros, gris muy oscuro sobre fondos claros
export function textOn(bg) { return luminance(bg) > 0.5 ? TEXT_DARK : TEXT_LIGHT; }

// amount < 0 oscurece (mezcla con negro), amount > 0 aclara (mezcla con blanco)
export function shade(hex, amount) {
  const target = amount < 0 ? 0 : 255, t = Math.abs(amount);
  return toHex(hexToRgb(hex).map(v => v + (target - v) * t));
}

// colorId de la paleta más parecido a un hex (distancia RGB)
export function nearestColorId(hex) {
  const [r, g, b] = hexToRgb(hex);
  let best = COLOR_IDS[0], bestDist = Infinity;
  COLOR_IDS.forEach(id => {
    const [r2, g2, b2] = hexToRgb(EVENT_COLORS[id].hex);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (d < bestDist) { bestDist = d; best = id; }
  });
  return best;
}
