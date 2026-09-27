import React from 'react';
import { CalendarClock, CheckCircle2, GripVertical, AlertTriangle } from 'lucide-react';
import { C, CATEGORY_CONFIG } from '../../lib/shared';
import { fmtDateTimeShort } from '../../lib/dates';
import { canStillSchedule } from '../../lib/schedule';

// Bandeja "Por programar": tareas pendientes / en proceso sin bloque en el calendario.
export default function ScheduleTray({ tasks, now, dragEnabled, draggingTaskId, onChipPointerDown }) {
  if (tasks.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: '12px', fontWeight: '600', color: C.success }}>
        <CheckCircle2 size={14} /> Todo programado ✓
      </div>
    );
  }
  const n = tasks.length;
  return (
    <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: '12px', background: 'linear-gradient(90deg, #FFFBEB, #FEF3C7)', border: '1.5px solid #FCD34D', boxShadow: '0 2px 8px rgba(217,119,6,0.12)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.warn, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CalendarClock size={15} color="#fff" />
        </div>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400E' }}>
          Tienes {n} {n === 1 ? 'tarea pendiente' : 'tareas pendientes'} sin horario asignado — arrástralas a tu calendario
          {!dragEnabled && <span style={{ fontWeight: '500', color: '#B45309' }}> (cambia a la vista Día o Semana para arrastrarlas)</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxHeight: 112, overflowY: 'auto' }}>
        {tasks.map(task => {
          const cfg = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.otro;
          const noTime = !canStillSchedule(task, now);
          const canDrag = dragEnabled && !noTime;
          const due = task.due_date ? new Date(task.due_date) : null;
          return (
            <div key={task.id}
              onPointerDown={e => { if (e.button === 0 && canDrag) onChipPointerDown(e, task); }}
              title={noTime ? 'Ya no quedan 4 h antes de la fecha límite' : canDrag ? 'Arrastra a la grilla para programar' : task.title}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 6px 6px', borderRadius: '8px', maxWidth: 260,
                background: noTime ? C.dangerLt : cfg.bg, borderLeft: '4px solid ' + (noTime ? C.danger : cfg.color),
                boxShadow: '0 1px 2px rgba(15,32,64,0.10)', cursor: canDrag ? 'grab' : noTime ? 'not-allowed' : 'default',
                userSelect: 'none', touchAction: 'none', opacity: draggingTaskId === task.id ? 0.4 : 1,
              }}>
              {canDrag
                ? <GripVertical size={13} color={cfg.color} style={{ flexShrink: 0 }} />
                : noTime ? <AlertTriangle size={13} color={C.danger} style={{ flexShrink: 0 }} /> : null}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: noTime ? C.danger : C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                <div style={{ fontSize: '10px', fontWeight: '600', color: noTime ? C.danger : C.muted, whiteSpace: 'nowrap' }}>
                  {noTime ? 'Sin tiempo para programar' : due ? 'Vence: ' + fmtDateTimeShort(due) : 'Sin fecha límite'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
