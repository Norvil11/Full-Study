import React from 'react';
import { CheckCircle2, Flag, Repeat } from 'lucide-react';
import { C } from '../../lib/shared';
import { fmtTime } from '../../lib/dates';
import { textOn, shade } from '../../lib/colors';

// Item compacto para la vista Mes y la fila "todo el día", al estilo de Google Calendar:
// - Evento de todo el día: barra rellena con su color.
// - Evento con hora / bloque de tarea: punto (o check) de color + "14:00 Título".
// - Fecha límite de una tarea: bandera de color + "18:00 Título".
export default function ItemChip({ item, onClick }) {
  const click = e => { e.stopPropagation(); onClick(item); };
  const tooltip = [item.title, item.allDay ? 'Todo el día' : fmtTime(item.start) + (item.kind === 'due' ? ' (fecha límite)' : ' – ' + fmtTime(item.end)), item.location]
    .filter(Boolean).join('\n');
  const base = {
    display: 'flex', alignItems: 'center', gap: 5, width: '100%', minWidth: 0, padding: '1px 6px', borderRadius: '4px',
    border: 'none', fontSize: '11px', lineHeight: '16px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
    overflow: 'hidden', whiteSpace: 'nowrap',
    opacity: item.completed ? 0.5 : 1, textDecoration: item.completed ? 'line-through' : 'none',
  };
  const label = <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>;

  if (item.allDay) {
    return (
      <button onClick={click} onPointerDown={e => e.stopPropagation()} title={tooltip}
        style={{ ...base, fontWeight: '600', background: item.bg, color: textOn(item.bg) }}
        onMouseEnter={e => { e.currentTarget.style.background = shade(item.bg, -0.08); }}
        onMouseLeave={e => { e.currentTarget.style.background = item.bg; }}>
        {item.recurring && <Repeat size={10} style={{ flexShrink: 0 }} />}{label}
      </button>
    );
  }

  const marker = item.kind === 'due'
    ? <Flag size={10} color={item.bg} fill={item.bg} style={{ flexShrink: 0 }} />
    : item.kind === 'task'
      ? <CheckCircle2 size={11} color={item.bg} strokeWidth={2.5} style={{ flexShrink: 0 }} />
      : <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.bg, flexShrink: 0 }} />;

  return (
    <button onClick={click} onPointerDown={e => e.stopPropagation()} title={tooltip}
      style={{ ...base, background: 'transparent', color: item.overdue ? C.danger : C.text, fontWeight: item.kind === 'due' ? '600' : '500' }}
      onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
      {marker}
      <span style={{ fontWeight: '700', flexShrink: 0 }}>{fmtTime(item.start)}</span>
      {label}
    </button>
  );
}
