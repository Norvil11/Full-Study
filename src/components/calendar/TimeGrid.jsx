import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Flag, Repeat } from 'lucide-react';
import { C } from '../../lib/shared';
import {
  WEEKDAYS_SHORT, MINUTES_PER_DAY, dayKey, sameDay, startOfDay, addDays, minutesOfDay, fmtTime,
} from '../../lib/dates';
import { scheduleLimit } from '../../lib/schedule';
import { textOn, shade } from '../../lib/colors';
import ItemChip from './ItemChip';

export const HOUR_PX = 48;                 // alto de una hora
export const PX_PER_MIN = HOUR_PX / 60;    // 15 min = 12 px
const GUTTER = 56;                         // columna de horas
const INITIAL_HOUR = 7;
const MIN_VISUAL_MIN = 30;                 // altura mínima visual de un bloque (30 min)
const LINE_PX = 14;

// Recorta un item al día y devuelve minutos [s, e) dentro de ese día
function clipToDay(item, day) {
  const d0 = startOfDay(day), d1 = addDays(d0, 1);
  if (item.end <= d0 || item.start >= d1) return null;
  const s = item.start <= d0 ? 0 : minutesOfDay(item.start);
  const e = item.end >= d1 ? MINUTES_PER_DAY : minutesOfDay(item.end);
  return { s, e: Math.max(e, s + MIN_VISUAL_MIN), dur: Math.round((item.end - item.start) / 60000) };
}

// Eventos superpuestos lado a lado (como Google Calendar)
function layoutColumn(entries) {
  const sorted = [...entries].sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));
  const out = [];
  let cluster = [], colEnds = [], clusterEnd = -1;
  const flush = () => { cluster.forEach(x => { x.cols = colEnds.length; }); out.push(...cluster); cluster = []; colEnds = []; };
  sorted.forEach(entry => {
    if (entry.s >= clusterEnd) { flush(); clusterEnd = -1; }
    let col = colEnds.findIndex(end => end <= entry.s);
    if (col === -1) { col = colEnds.length; colEnds.push(entry.e); } else colEnds[col] = entry.e;
    const placed = { ...entry, col };
    cluster.push(placed);
    clusterEnd = Math.max(clusterEnd, entry.e);
  });
  flush();
  return out;
}

const hatch = (rgba) => `repeating-linear-gradient(45deg, ${rgba} 0 6px, transparent 6px 12px)`;


// Bloque relleno como en Google Calendar. El texto se acomoda según la altura.
function Block({ entry, drag, onItemPointerDown, onItemClick }) {
  const [hover, setHover] = useState(false);
  const { item, s, e, col, cols, dur } = entry;
  const height = (e - s) * PX_PER_MIN - 2;                 // 2 px de separación vertical
  const isDragged = drag?.item?.key === item.key;
  const isTask = item.kind === 'task';
  const bg = hover && !drag ? shade(item.bg, -0.08) : item.bg;
  const fg = textOn(item.bg);
  const range = fmtTime(item.start) + ' – ' + fmtTime(item.end);
  const location = item.location || '';

  // < 45 min: una línea "Título, 14:00". ≥ 45 min: título (hasta 2 líneas), rango y ubicación si caben.
  const compact = dur < 45;
  const lines = Math.floor((height - 6) / LINE_PX);
  const titleLines = !compact && (lines >= 4 || (!location && lines >= 3)) ? 2 : 1;
  const showLocation = !compact && location && lines >= titleLines + 2;

  const handleDown = (ev, mode) => {
    ev.stopPropagation();
    if (ev.button !== 0) return;
    if (item.draggable) onItemPointerDown(ev, item, mode);
  };
  const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

  return (
    <div onPointerDown={ev => handleDown(ev, 'move')}
      onClick={ev => { ev.stopPropagation(); if (!item.draggable) onItemClick(item); }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      title={[item.title, range, location, item.recurring ? 'Evento recurrente' : '', item.completed ? 'Completada' : ''].filter(Boolean).join('\n')}
      style={{
        position: 'absolute', top: s * PX_PER_MIN + 1, height,
        left: `calc(${(col / cols) * 100}% + 1px)`, width: `calc(${100 / cols}% - 3px)`,
        borderRadius: '5px', padding: compact ? '0 6px' : '3px 6px', overflow: 'hidden', boxSizing: 'border-box',
        background: bg, color: fg, fontSize: '11px', lineHeight: LINE_PX + 'px',
        borderLeft: isTask ? '4px solid ' + shade(item.bg, -0.35) : 'none',
        boxShadow: hover && !drag ? '0 3px 8px rgba(15,32,64,0.28)' : 'none',
        cursor: item.draggable ? 'grab' : 'pointer', touchAction: 'none', userSelect: 'none',
        opacity: isDragged ? 0.35 : item.completed ? 0.5 : 1,
        textDecoration: item.completed ? 'line-through' : 'none',
        zIndex: hover ? 3 : 2, transition: 'background 0.12s, box-shadow 0.12s',
        display: 'flex', flexDirection: 'column', justifyContent: compact ? 'center' : 'flex-start',
      }}>
      {compact ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          {isTask && <CheckCircle2 size={11} style={{ flexShrink: 0 }} />}
          {item.recurring && <Repeat size={10} style={{ flexShrink: 0 }} />}
          <span style={ellipsis}><b>{item.title}</b>, {fmtTime(item.start)}</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
            {isTask && <CheckCircle2 size={11} style={{ flexShrink: 0, marginTop: 1.5 }} />}
            {item.recurring && <Repeat size={10} style={{ flexShrink: 0, marginTop: 2 }} />}
            <span style={{ fontWeight: '700', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: titleLines, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>{item.title}</span>
          </div>
          <div style={ellipsis}>{range}</div>
          {showLocation && <div style={{ ...ellipsis, opacity: 0.9 }}>{location}</div>}
        </>
      )}
      {item.draggable && (
        <div onPointerDown={ev => handleDown(ev, 'resize')}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 7, cursor: 'ns-resize' }} />
      )}
    </div>
  );
}

export default function TimeGrid({
  days, timedItems, allDayByDay, now, drag = null,
  columnsRef, scrollRef,
  onEmptyPointerDown, onItemPointerDown, onItemClick,
}) {
  // Posición inicial: 07:00
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = INITIAL_HOUR * HOUR_PX - 10; // deja ver la etiqueta 07:00
  }, []);

  const columns = useMemo(() => days.map(day => {
    const entries = [];
    timedItems.forEach(item => { const c = clipToDay(item, day); if (c) entries.push({ item, ...c }); });
    return layoutColumn(entries);
  }), [days, timedItems]);

  const gridCols = `${GUTTER}px repeat(${days.length}, minmax(0, 1fr))`;
  const dragTask = drag?.task;
  const due = dragTask?.due_date ? new Date(dragTask.due_date) : null;
  const limit = dragTask ? scheduleLimit(dragTask) : null;

  return (
    <div style={{ background: C.surface, border: '1.5px solid ' + C.border, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,32,64,0.05)', userSelect: drag ? 'none' : 'auto' }}>
      {/* Cabecera de días */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, background: C.bg, borderBottom: '1px solid ' + C.border, paddingRight: 4 }}>
        <div />
        {days.map(d => {
          const isToday = sameDay(d, now);
          return (
            <div key={dayKey(d)} style={{ padding: '8px 4px', textAlign: 'center', borderLeft: '1px solid ' + C.border }}>
              <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', color: isToday ? C.blue : C.muted }}>
                {WEEKDAYS_SHORT[(d.getDay() + 6) % 7]}
              </div>
              <div style={{
                margin: '2px auto 0', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '17px', fontWeight: '800', background: isToday ? C.blue : 'transparent', color: isToday ? '#fff' : C.navy,
              }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Fila "todo el día" */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '2px solid ' + C.border, paddingRight: 4 }}>
        <div style={{ fontSize: '10px', color: C.mutedLt, padding: '6px 6px 0', textAlign: 'right' }}>todo el día</div>
        {days.map(d => (
          <div key={dayKey(d)} style={{ borderLeft: '1px solid ' + C.border, padding: '3px', minHeight: 28, maxHeight: 88, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            {(allDayByDay[dayKey(d)] || []).map(item => <ItemChip key={item.key} item={item} onClick={onItemClick} />)}
          </div>
        ))}
      </div>

      {/* Grilla horaria con scroll */}
      <div ref={scrollRef} style={{ height: 'calc(100vh - 380px)', minHeight: 420, overflowY: 'auto', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, height: 24 * HOUR_PX, position: 'relative' }}>
          {/* Horas */}
          <div style={{ position: 'relative' }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ position: 'absolute', top: h * HOUR_PX - 7, right: 8, fontSize: '10px', fontWeight: '600', color: C.mutedLt }}>
                {h === 0 ? '' : String(h).padStart(2, '0') + ':00'}
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          <div ref={columnsRef} style={{ gridColumn: `2 / span ${days.length}`, display: 'grid', gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, position: 'relative' }}>
            {days.map((day, i) => {
              const d0 = startOfDay(day), d1 = addDays(d0, 1);
              const isToday = sameDay(day, now);
              // Zonas prohibidas mientras se arrastra una tarea
              const zones = [];
              if (dragTask) {
                if (now > d0) zones.push({ key: 'past', s: 0, e: now >= d1 ? MINUTES_PER_DAY : minutesOfDay(now), bg: hatch('rgba(100,116,139,0.10)') });
                if (limit && limit < d1) zones.push({ key: 'due', s: limit <= d0 ? 0 : minutesOfDay(limit), e: MINUTES_PER_DAY, bg: hatch('rgba(220,38,38,0.13)') });
              }
              const preview = drag?.preview && clipToDay(drag.preview, day);
              return (
                <div key={dayKey(day)}
                  onPointerDown={e => { if (e.button === 0 && onEmptyPointerDown) onEmptyPointerDown(e, i); }}
                  style={{
                    position: 'relative', borderLeft: '1px solid ' + C.border, minWidth: 0,
                    cursor: onEmptyPointerDown ? 'cell' : 'default',
                    backgroundColor: isToday ? 'rgba(239,246,255,0.45)' : 'transparent',
                    backgroundImage: `linear-gradient(to bottom, ${C.border} 1px, transparent 1px), linear-gradient(to bottom, #EEF2F7 1px, transparent 1px)`,
                    backgroundSize: `100% ${HOUR_PX}px, 100% ${HOUR_PX / 4}px`,
                  }}>
                  {zones.map(z => (
                    <div key={z.key} style={{ position: 'absolute', left: 0, right: 0, top: z.s * PX_PER_MIN, height: (z.e - z.s) * PX_PER_MIN, background: z.bg, pointerEvents: 'none', zIndex: 1 }} />
                  ))}
                  {due && sameDay(due, day) && (
                    <div style={{ position: 'absolute', left: 0, right: 0, top: minutesOfDay(due) * PX_PER_MIN, borderTop: '2px solid ' + drag.color, pointerEvents: 'none', zIndex: 4 }}>
                      <span style={{ position: 'absolute', left: 2, top: -18, display: 'flex', alignItems: 'center', gap: 3, fontSize: '10px', fontWeight: '800', color: textOn(drag.color), background: drag.color, padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        <Flag size={9} /> Vence {fmtTime(due)}
                      </span>
                    </div>
                  )}

                  {columns[i].map(entry => (
                    <Block key={entry.item.key} entry={entry} drag={drag} onItemPointerDown={onItemPointerDown} onItemClick={onItemClick} />
                  ))}

                  {preview && (
                    <div style={{
                      position: 'absolute', left: 1, right: 3, top: preview.s * PX_PER_MIN + 1, height: (preview.e - preview.s) * PX_PER_MIN - 2,
                      borderRadius: '5px', padding: '3px 6px', fontSize: '11px', lineHeight: '14px', fontWeight: '700', zIndex: 5, pointerEvents: 'none', boxSizing: 'border-box', overflow: 'hidden',
                      background: drag.invalid ? C.danger : drag.color, color: textOn(drag.invalid ? C.danger : drag.color),
                      boxShadow: '0 6px 16px rgba(15,32,64,0.30)', opacity: 0.92,
                    }}>
                      {drag.title || 'Nuevo evento'}
                      <div style={{ fontWeight: '500' }}>{fmtTime(drag.preview.start)} – {fmtTime(drag.preview.end)}</div>
                    </div>
                  )}

                  {isToday && (
                    <div style={{ position: 'absolute', left: -1, right: 0, top: minutesOfDay(now) * PX_PER_MIN, borderTop: '2px solid ' + C.danger, zIndex: 6, pointerEvents: 'none' }}>
                      <span style={{ position: 'absolute', left: -6, top: -6, width: 10, height: 10, borderRadius: '50%', background: C.danger }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
