import { Briefcase, GraduationCap, Tag } from 'lucide-react';

export const C = {
  navy:      '#0F2040',
  blue:      '#1D4ED8',
  accent:    '#3B82F6',
  accentLt:  '#EFF6FF',
  bg:        '#F8FAFC',
  surface:   '#FFFFFF',
  border:    '#CBD5E1',
  muted:     '#475569',
  mutedLt:   '#94A3B8',
  text:      '#0F172A',
  danger:    '#DC2626',
  dangerLt:  '#FEE2E2',
  success:   '#16A34A',
  successLt: '#DCFCE7',
  warn:      '#D97706',
  warnLt:    '#FEF3C7',
  violet:    '#7C3AED',
  violetLt:  '#EDE9FE',
  gold:      '#F59E0B',
  darkBg:    '#000000',
};

// Tipo de tarea (columna tasks.category)
export const CATEGORY_CONFIG = {
  trabajo:     { label: 'Trabajo',     icon: Briefcase,     color: C.blue,    bg: C.accentLt, border: '#BFDBFE' },
  universidad: { label: 'Universidad', icon: GraduationCap, color: '#BE185D', bg: '#FCE7F3',  border: '#FBCFE8' },
  otro:        { label: 'Otro',        icon: Tag,           color: '#0F766E', bg: '#CCFBF1',  border: '#99F6E4' },
};

// Prioridad de tarea (columna tasks.priority)
export const PRIORITY_CONFIG = {
  low:    { label: 'Baja',    color: C.accent,  bg: C.accentLt,  border: '#BFDBFE' },
  medium: { label: 'Media',   color: C.warn,    bg: C.warnLt,    border: '#FDE68A' },
  high:   { label: 'Alta',    color: C.danger,  bg: C.dangerLt,  border: '#FECACA' },
  urgent: { label: 'Urgente', color: C.violet,  bg: C.violetLt,  border: '#DDD6FE' },
};

export function isOverdue(due, status) {
  if (!due || status === 'completed') return false;
  return new Date(due) < new Date();
}
