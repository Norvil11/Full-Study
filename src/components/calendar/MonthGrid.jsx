import React from 'react';
import { C } from '../../lib/shared';
import { WEEKDAYS_SHORT, dayKey, sameDay } from '../../lib/dates';
import ItemChip from './ItemChip';

const MAX_ITEMS_PER_CELL = 3;

export default function MonthGrid({ cursor, days, itemsByDay, today, onDayClick, onItemClick, onMore }) {
  return (
    <div style={{ background: C.surface, border: '1.5px solid ' + C.border, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,32,64,0.05)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', background: C.bg, borderBottom: '1px solid ' + C.border }}>
        {WEEKDAYS_SHORT.map(w => (
          <div key={w} style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '700', color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {days.map((d, i) => {
          const items = itemsByDay[dayKey(d)] || [];
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, today);
          const clickable = d >= today;
          const visible = items.slice(0, MAX_ITEMS_PER_CELL);
          const hidden = items.length - visible.length;
          return (
            <div key={i} onClick={() => { if (clickable) onDayClick(d); }}
              title={clickable ? 'Crear tarea con fecha límite este día' : undefined}
              style={{
                minHeight: 112, padding: '6px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0,
                borderRight: (i % 7 !== 6) ? '1px solid ' + C.border : 'none',
                borderBottom: i < days.length - 7 ? '1px solid ' + C.border : 'none',
                background: inMonth ? C.surface : C.bg, cursor: clickable ? 'pointer' : 'default', transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (clickable) e.currentTarget.style.background = C.accentLt; }}
              onMouseLeave={e => { e.currentTarget.style.background = inMonth ? C.surface : C.bg; }}>
              <div style={{
                alignSelf: 'flex-start', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: isToday ? '800' : '600',
                background: isToday ? C.blue : 'transparent', color: isToday ? '#fff' : inMonth ? C.navy : C.mutedLt,
              }}>{d.getDate()}</div>
              {visible.map(item => <ItemChip key={item.key} item={item} onClick={onItemClick} />)}
              {hidden > 0 && (
                <button onClick={e => { e.stopPropagation(); onMore(d); }}
                  style={{ border: 'none', background: 'transparent', padding: '1px 6px', fontSize: '11px', fontWeight: '700', color: C.blue, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  +{hidden} más
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
