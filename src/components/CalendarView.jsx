import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Loader2, LogOut, RefreshCw, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { C, CATEGORY_CONFIG, isOverdue } from '../lib/shared';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_ITEMS_PER_CELL = 3;

// ─── DATE HELPERS (semana empieza el lunes) ──────────────────────────────────
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeek(d) { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); }
function dayKey(d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
function sameDay(a, b) { return dayKey(a) === dayKey(b); }
// Google devuelve los eventos de todo el día como 'YYYY-MM-DD' (sin zona horaria)
function parseLocalDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function formatHour(d) { return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }); }

function getRange(cursor, mode) {
  if (mode === 'week') {
    const start = startOfWeek(cursor);
    return { start, days: 7 };
  }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  return { start: startOfWeek(first), days: 42 };
}

function rangeTitle(cursor, mode, start) {
  if (mode === 'month') {
    const s = cursor.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const end = addDays(start, 6);
  const fmt = (d, opts) => d.toLocaleDateString('es-PE', opts);
  return fmt(start, { day: 'numeric', month: 'short' }) + ' – ' + fmt(end, { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── ITEM (tarea o evento de Google) ─────────────────────────────────────────
function CalendarItem({ item, onTaskClick, showTime }) {
  const time = item.timed ? formatHour(item.date) : null;

  if (item.kind === 'google') {
    const ev = item.event;
    return (
      <a href={ev.htmlLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
        title={(ev.summary || '(Sin título)') + ' · Google Calendar'}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: '4px',
          fontSize: '11px', fontWeight: '500', color: C.muted, background: '#F1F5F9',
          border: '1px dashed ' + C.mutedLt, textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap',
        }}>
        {showTime && time && <span style={{ fontWeight: '700', flexShrink: 0 }}>{time}</span>}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.summary || '(Sin título)'}</span>
        <ExternalLink size={9} style={{ flexShrink: 0, marginLeft: 'auto' }} />
      </a>
    );
  }

  const task = item.task;
  const cfg = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.otro;
  const overdue = isOverdue(task.due_date, task.status);
  const completed = task.status === 'completed';
  const color = overdue ? C.danger : cfg.color;
  return (
    <button onClick={e => { e.stopPropagation(); onTaskClick(task); }}
      title={task.title + ' · ' + cfg.label + (overdue ? ' · Vencida' : completed ? ' · Completada' : '')}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, width: '100%', padding: '2px 6px',
        borderRadius: '4px', border: 'none', borderLeft: '3px solid ' + color,
        background: overdue ? C.dangerLt : cfg.bg, color: overdue ? C.danger : C.navy,
        fontSize: '11px', fontWeight: '600', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
        overflow: 'hidden', whiteSpace: 'nowrap',
        opacity: completed ? 0.5 : 1, textDecoration: completed ? 'line-through' : 'none',
      }}>
      {showTime && time && <span style={{ fontWeight: '700', flexShrink: 0, color }}>{time}</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
    </button>
  );
}

// ─── GOOGLE CONNECT CONTROLS ─────────────────────────────────────────────────
function GoogleControls({ google, loading }) {
  const btn = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: '8px',
    fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
  };
  if (!google) return null;
  if (!google.configured) {
    return <span style={{ fontSize: '11px', color: C.mutedLt }}>Google Calendar no configurado</span>;
  }
  if (google.status === 'connected') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '11px', fontWeight: '700', color: C.success, background: C.successLt, padding: '4px 10px', borderRadius: '20px' }}>
          {loading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <CalendarIcon size={11} />}
          Google Calendar conectado
        </span>
        <button onClick={google.disconnect} style={{ ...btn, border: '1.5px solid ' + C.border, background: C.surface, color: C.muted }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = C.danger; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
          <LogOut size={12} /> Desconectar
        </button>
      </div>
    );
  }
  if (google.status === 'expired') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '11px', fontWeight: '700', color: C.warn }}>
          <AlertTriangle size={12} /> La sesión de Google expiró
        </span>
        <button onClick={google.connect} style={{ ...btn, border: 'none', background: C.navy, color: '#fff' }}>
          <RefreshCw size={12} /> Reconectar
        </button>
        <button onClick={google.disconnect} style={{ ...btn, border: '1.5px solid ' + C.border, background: C.surface, color: C.muted }}>
          Desconectar
        </button>
      </div>
    );
  }
  return (
    <button onClick={google.connect} style={{ ...btn, border: '1.5px solid ' + C.border, background: C.surface, color: C.navy }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentLt; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; }}>
      <CalendarIcon size={13} color={C.blue} /> Conectar Google Calendar
    </button>
  );
}

// ─── CALENDAR VIEW ───────────────────────────────────────────────────────────
export default function CalendarView({ tasks, onTaskClick, onDayClick, google = null }) {
  const [cursor, setCursor]       = useState(() => startOfDay(new Date()));
  const [mode, setMode]           = useState('month');
  const [events, setEvents]       = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError]     = useState('');

  const { start, days } = getRange(cursor, mode);
  const end = addDays(start, days);
  const today = startOfDay(new Date());
  const googleConnected = google?.status === 'connected';

  // Eventos de Google del rango visible
  useEffect(() => {
    if (!googleConnected) { setEvents([]); setEventsError(''); return; }
    let cancelled = false;
    setLoadingEvents(true); setEventsError('');
    google.listEvents(start, end)
      .then(items => { if (!cancelled) setEvents(items); })
      .catch(err => { if (!cancelled) { setEvents([]); if (!err.isAuthError) setEventsError(err.message); } })
      .finally(() => { if (!cancelled) setLoadingEvents(false); });
    return () => { cancelled = true; };
  }, [googleConnected, start.getTime(), end.getTime()]);

  const itemsByDay = useMemo(() => {
    const map = {};
    const push = (d, item) => { (map[dayKey(d)] ||= []).push(item); };

    tasks.forEach(task => {
      if (!task.due_date) return;
      push(new Date(task.due_date), { kind: 'task', task, date: new Date(task.due_date), timed: true });
    });

    // No duplicar eventos que ya son tareas de la app
    const linked = new Set(tasks.map(t => t.google_event_id).filter(Boolean));
    events.forEach(ev => {
      if (linked.has(ev.id) || !ev.start) return;
      if (ev.start.dateTime) {
        const d = new Date(ev.start.dateTime);
        push(d, { kind: 'google', event: ev, date: d, timed: true });
      } else if (ev.start.date) {
        // Evento de todo el día: puede abarcar varios días (end.date es exclusivo)
        const s = parseLocalDate(ev.start.date);
        const e = ev.end?.date ? parseLocalDate(ev.end.date) : addDays(s, 1);
        for (let d = s; d < e; d = addDays(d, 1)) push(d, { kind: 'google', event: ev, date: d, timed: false });
      }
    });

    Object.values(map).forEach(list => list.sort((a, b) =>
      (a.timed === b.timed ? a.date - b.date : a.timed ? 1 : -1)));
    return map;
  }, [tasks, events]);

  const move = (dir) => {
    if (mode === 'week') setCursor(c => addDays(c, 7 * dir));
    else setCursor(c => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  };

  const handleDayClick = (d) => { if (d >= today) onDayClick(d); };

  const navBtn = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32, minWidth: 32, padding: '0 10px',
    borderRadius: '8px', border: '1.5px solid ' + C.border, background: C.surface, color: C.navy,
    fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
  };

  const cells = Array.from({ length: days }, (_, i) => addDays(start, i));

  return (
    <div style={{ animation: 'fadeUp 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={navBtn} onClick={() => move(-1)} title="Anterior"><ChevronLeft size={15} /></button>
          <button style={navBtn} onClick={() => setCursor(startOfDay(new Date()))}>Hoy</button>
          <button style={navBtn} onClick={() => move(1)} title="Siguiente"><ChevronRight size={15} /></button>
          <h2 style={{ margin: '0 0 0 8px', fontSize: '20px', fontWeight: '800', color: C.navy }}>{rangeTitle(cursor, mode, start)}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <GoogleControls google={google} loading={loadingEvents} />
          <div style={{ display: 'flex', border: '1.5px solid ' + C.border, borderRadius: '8px', overflow: 'hidden' }}>
            {[['month', 'Mes'], ['week', 'Semana']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)}
                style={{ padding: '6px 14px', border: 'none', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                  background: mode === m ? C.navy : C.surface, color: mode === m ? '#fff' : C.muted }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {eventsError && (
        <div style={{ padding: '8px 12px', marginBottom: 12, background: C.dangerLt, border: '1px solid #FECACA', borderRadius: '8px', color: C.danger, fontSize: '12px', fontWeight: '600' }}>
          No se pudieron cargar los eventos de Google: {eventsError}
        </div>
      )}

      {/* Grid */}
      <div style={{ background: C.surface, border: '1.5px solid ' + C.border, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,32,64,0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', background: C.bg, borderBottom: '1px solid ' + C.border }}>
          {WEEKDAYS.map((w, i) => (
            <div key={w} style={{ padding: '8px 10px', fontSize: '11px', fontWeight: '700', color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {mode === 'week' ? w + ' ' + cells[i].getDate() : w}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {cells.map((d, i) => {
            const items = itemsByDay[dayKey(d)] || [];
            const inMonth = mode === 'week' || d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const clickable = d >= today;
            const visible = mode === 'week' ? items : items.slice(0, MAX_ITEMS_PER_CELL);
            const hidden = items.length - visible.length;
            return (
              <div key={i} onClick={() => handleDayClick(d)}
                title={clickable ? 'Crear tarea para este día' : undefined}
                style={{
                  minHeight: mode === 'week' ? 460 : 112, padding: '6px', display: 'flex', flexDirection: 'column', gap: 3,
                  borderRight: (i % 7 !== 6) ? '1px solid ' + C.border : 'none',
                  borderBottom: i < days - 7 ? '1px solid ' + C.border : 'none',
                  background: inMonth ? C.surface : C.bg, cursor: clickable ? 'pointer' : 'default',
                  transition: 'background 0.12s', minWidth: 0,
                }}
                onMouseEnter={e => { if (clickable) e.currentTarget.style.background = C.accentLt; }}
                onMouseLeave={e => { e.currentTarget.style.background = inMonth ? C.surface : C.bg; }}>
                {mode === 'month' && (
                  <div style={{
                    alignSelf: 'flex-start', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: isToday ? '800' : '600',
                    background: isToday ? C.blue : 'transparent', color: isToday ? '#fff' : inMonth ? C.navy : C.mutedLt,
                  }}>{d.getDate()}</div>
                )}
                {mode === 'week' && isToday && (
                  <div style={{ height: 3, background: C.blue, borderRadius: 2, marginBottom: 3 }} />
                )}
                {visible.map((item, j) => (
                  <CalendarItem key={j} item={item} onTaskClick={onTaskClick} showTime={mode === 'week'} />
                ))}
                {hidden > 0 && (
                  <button onClick={e => { e.stopPropagation(); setCursor(d); setMode('week'); }}
                    style={{ border: 'none', background: 'transparent', padding: '1px 6px', fontSize: '11px', fontWeight: '700', color: C.blue, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    +{hidden} más
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap', fontSize: '11px', color: C.muted }}>
        {Object.values(CATEGORY_CONFIG).map(cfg => (
          <span key={cfg.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: cfg.bg, borderLeft: '3px solid ' + cfg.color }} />{cfg.label}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: C.dangerLt, borderLeft: '3px solid ' + C.danger }} />Vencida
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: 0.5, textDecoration: 'line-through' }}>Completada</span>
        {googleConnected && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#F1F5F9', border: '1px dashed ' + C.mutedLt }} />Google Calendar
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: C.mutedLt }}>Haz clic en un día para crear una tarea</span>
      </div>
    </div>
  );
}
