import React from 'react';
import { CheckCircle2, Flag } from 'lucide-react';
import { C } from '../../lib/shared';
import { fmtTime } from '../../lib/dates';

// Chip compacto para la vista Mes y la fila "todo el día".
// item.kind: 'task' (bloque programado) | 'due' (fecha límite) | 'google'
export default function ItemChip({ item, onClick, showTime = true }) {
  const base = {
    display: 'flex', alignItems: 'center', gap: 4, width: '100%', padding: '2px 6px', borderRadius: '4px',
    fontSize: '11px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
    overflow: 'hidden', whiteSpace: 'nowrap', minWidth: 0,
    opacity: item.completed ? 0.5 : 1, textDecoration: item.completed ? 'line-through' : 'none',
  };
  const time = showTime && !item.allDay ? <span style={{ fontWeight: '700', flexShrink: 0 }}>{fmtTime(item.start)}</span> : null;
  const label = <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>;
  const click = e => { e.stopPropagation(); onClick(item); };

  if (item.kind === 'google') {
    return (
      <button onClick={click} onPointerDown={e => e.stopPropagation()} title={item.title + ' · Google Calendar'}
        style={{ ...base, fontWeight: '500', color: C.muted, background: '#F1F5F9', border: '1px dashed ' + C.mutedLt }}>
        {time}{label}
      </button>
    );
  }
  if (item.kind === 'due') {
    return (
      <button onClick={click} onPointerDown={e => e.stopPropagation()} title={'Fecha límite: ' + item.title}
        style={{ ...base, fontWeight: '600', color: item.color, background: 'transparent', border: 'none', padding: '1px 4px' }}>
        <Flag size={10} style={{ flexShrink: 0 }} />{time}{label}
      </button>
    );
  }
  return (
    <button onClick={click} onPointerDown={e => e.stopPropagation()} title={item.title}
      style={{ ...base, fontWeight: '600', color: C.navy, background: item.bg, border: 'none', borderLeft: '3px solid ' + item.color }}>
      <CheckCircle2 size={10} color={item.color} style={{ flexShrink: 0 }} />{time}{label}
    </button>
  );
}
