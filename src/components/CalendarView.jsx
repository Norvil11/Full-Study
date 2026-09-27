import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Loader2, LogOut, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { C, CATEGORY_CONFIG, isOverdue } from '../lib/shared';
import {
  startOfDay, addDays, addMinutes, startOfWeek, dayKey, sameDay, parseLocalDate, minutesOfDay,
  snap, snapFloor, MINUTES_PER_DAY, MONTHS_SHORT,
} from '../lib/dates';
import { timedRange } from '../lib/googleCalendar';
import TimeGrid, { PX_PER_MIN } from './calendar/TimeGrid';
import MonthGrid from './calendar/MonthGrid';
import EventModal from './calendar/EventModal';
import EventDetail from './calendar/EventDetail';
import ScheduleTray from './calendar/ScheduleTray';
import { validateSchedule } from '../lib/schedule';

// ─── RANGO VISIBLE ───────────────────────────────────────────────────────────
function getRange(cursor, mode) {
  if (mode === 'day')  return { start: startOfDay(cursor), days: 1 };
  if (mode === 'week') return { start: startOfWeek(cursor), days: 7 };
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  return { start: startOfWeek(first), days: 42 };
}

function rangeTitle(cursor, mode, start) {
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  if (mode === 'month') return cap(cursor.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }));
  if (mode === 'day') return cap(cursor.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
  const end = addDays(start, 6);
  return start.getDate() + ' ' + MONTHS_SHORT[start.getMonth()] + ' – ' + end.getDate() + ' ' + MONTHS_SHORT[end.getMonth()] + ' ' + end.getFullYear();
}

// ─── ITEMS NORMALIZADOS ──────────────────────────────────────────────────────
// Tareas programadas (bloques), fechas límite (marcadores) y eventos de Google
function buildItems(tasks, events) {
  const blocks = [], dues = [], google = [];
  tasks.forEach(task => {
    const cfg = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.otro;
    const completed = task.status === 'completed';
    if (task.scheduled_start && task.scheduled_end) {
      blocks.push({
        key: 't-' + task.id, kind: 'task', task, title: task.title,
        start: new Date(task.scheduled_start), end: new Date(task.scheduled_end),
        color: cfg.color, bg: cfg.bg, completed, draggable: !completed,
      });
    }
    if (task.due_date) {
      const due = new Date(task.due_date);
      dues.push({
        key: 'd-' + task.id, kind: 'due', task, title: task.title, start: due, end: due,
        color: isOverdue(task.due_date, task.status) ? C.danger : cfg.color, completed,
      });
    }
  });

  // No dibujar dos veces los eventos que ya son tareas de la app
  const linked = new Set(tasks.map(t => t.google_event_id).filter(Boolean));
  events.forEach(ev => {
    if (linked.has(ev.id) || !ev.start) return;
    const recurring = Boolean(ev.recurringEventId);
    const own = !ev.organizer || ev.organizer.self === true; // en invitaciones solo el organizador puede cambiarlo
    const base = { kind: 'google', event: ev, title: ev.summary || '(Sin título)', recurring, own };
    if (ev.start.dateTime) {
      const start = new Date(ev.start.dateTime);
      const end = new Date(ev.end?.dateTime || ev.start.dateTime);
      const editable = own && !recurring && sameDay(start, addMinutes(end, -1));
      google.push({ ...base, key: 'g-' + ev.id, start, end, allDay: false, editable, draggable: editable });
    } else if (ev.start.date) {
      const start = parseLocalDate(ev.start.date);
      const end = ev.end?.date ? parseLocalDate(ev.end.date) : addDays(start, 1); // end.date es exclusivo
      google.push({ ...base, key: 'g-' + ev.id, start, end, allDay: true, editable: false, draggable: false });
    }
  });
  return { blocks, dues, google };
}

function groupByDay(list, into) {
  list.forEach(item => {
    if (item.allDay) {
      for (let d = startOfDay(item.start); d < item.end; d = addDays(d, 1)) (into[dayKey(d)] ||= []).push(item);
    } else {
      (into[dayKey(item.start)] ||= []).push(item);
    }
  });
  return into;
}
const sortDay = map => {
  Object.values(map).forEach(list => list.sort((a, b) => (a.allDay === b.allDay ? a.start - b.start : a.allDay ? -1 : 1)));
  return map;
};

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
export default function CalendarView({ tasks, onTaskClick, onDayClick, onScheduleTask, google = null }) {
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [mode, setMode]     = useState('week');
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError]     = useState('');
  const [now, setNow] = useState(() => new Date());
  const scrollRef  = useRef(null);
  const columnsRef = useRef(null);

  // Reloj para la línea de hora actual
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const { start, days } = getRange(cursor, mode);
  const end = addDays(start, days);
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => addDays(start, i)), [start.getTime(), days]);
  const today = startOfDay(now);
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

  const { blocks, dues, google: googleItems } = useMemo(() => buildItems(tasks, events), [tasks, events]);

  const timedItems  = useMemo(() => [...blocks, ...googleItems.filter(i => !i.allDay)], [blocks, googleItems]);
  const allDayByDay = useMemo(() => sortDay(groupByDay([...dues, ...googleItems.filter(i => i.allDay)], {})), [dues, googleItems]);
  const monthByDay  = useMemo(() => sortDay(groupByDay([...blocks, ...dues, ...googleItems], {})), [blocks, dues, googleItems]);

  const move = (dir) => {
    if (mode === 'day') setCursor(c => addDays(c, dir));
    else if (mode === 'week') setCursor(c => addDays(c, 7 * dir));
    else setCursor(c => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  };

  const [drag, setDrag]               = useState(null);
  const dragRef                       = useRef(null);
  const [eventModal, setEventModal]   = useState(null);  // { initial, item? }
  const [eventDetail, setEventDetail] = useState(null);  // item de Google
  const [connectPrompt, setConnectPrompt] = useState(false);
  const [toast, setToast]             = useState(null);  // { msg, tone }

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);
  const showError = (err) => setToast({
    tone: 'error',
    msg: err?.isAuthError ? 'La sesión de Google expiró. Reconecta Google Calendar y vuelve a intentarlo.' : (err?.message || String(err)),
  });

  const handleItemClick = (item) => {
    if (item.task) onTaskClick(item.task);
    else if (item.kind === 'google') setEventDetail(item);
  };

  // ── Eventos de Google: crear / editar / mover / eliminar ────────────────
  const replaceEvent = (ev) => setEvents(prev => prev.map(e => (e.id === ev.id ? ev : e)));

  const openCreate = (start, end) => {
    if (!googleConnected) { setConnectPrompt(true); return; }
    setEventModal({ initial: { start, end } });
  };

  const saveEvent = async ({ title, description, location, start, end }) => {
    const body = { summary: title, description, location, ...timedRange(start, end) };
    if (eventModal?.item) replaceEvent(await google.patchEvent(eventModal.item.event.id, body));
    else { const ev = await google.insertEvent(body); setEvents(prev => [...prev, ev]); }
  };

  const deleteEvent = async (item) => {
    await google.deleteEvent(item.event.id);
    setEvents(prev => prev.filter(e => e.id !== item.event.id));
  };

  const moveGoogleEvent = async (item, start, end) => {
    const previous = item.event;
    replaceEvent({ ...previous, start: { ...previous.start, dateTime: start.toISOString() }, end: { ...previous.end, dateTime: end.toISOString() } });
    try {
      replaceEvent(await google.patchEvent(previous.id, timedRange(start, end)));
    } catch (err) {
      replaceEvent(previous);
      showError(err);
    }
  };

  // ── Arrastre con pointer events (ajuste cada 15 min) ─────────────────────
  // Convierte un punto de pantalla en { day, min } dentro de la grilla visible
  const slotFromPoint = (x, y) => {
    const cols = columnsRef.current, scroller = scrollRef.current;
    if (!cols || !scroller) return null;
    const r = cols.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
    if (x < r.left || x > r.right || y < sr.top || y > sr.bottom) return null;
    const idx = Math.min(days - 1, Math.max(0, Math.floor((x - r.left) / (r.width / days))));
    const min = Math.min(MINUTES_PER_DAY, Math.max(0, (y - r.top) / PX_PER_MIN));
    return { day: dayList[idx], min };
  };

  const computePreview = (d, slot) => {
    if (d.type === 'create') {
      if (!slot) return d.preview;
      const m = sameDay(slot.day, d.day) ? slot.min : slot.day > d.day ? MINUTES_PER_DAY : 0;
      let s = d.anchorMin, e;
      if (m >= d.anchorMin) e = Math.max(d.anchorMin + 15, Math.ceil(m / 15) * 15);
      else { s = snapFloor(m); e = d.anchorMin + 15; }
      return { start: addMinutes(d.day, s), end: addMinutes(d.day, Math.min(e, MINUTES_PER_DAY)) };
    }
    if (d.type === 'resize') {
      if (!slot) return d.preview;
      const start = d.item.start, dayStart = startOfDay(start);
      const m = snap((slot.day - dayStart) / 60000 + slot.min);
      const e = Math.min(MINUTES_PER_DAY, Math.max(minutesOfDay(start) + 15, m));
      return { start, end: addMinutes(dayStart, e) };
    }
    // move (evento o bloque de tarea) y tray (chip de la bandeja)
    if (!slot) return d.type === 'tray' ? null : d.preview;
    const s = Math.min(MINUTES_PER_DAY - d.durMin, Math.max(0, snap(slot.min - d.offsetMin)));
    const start = addMinutes(startOfDay(slot.day), s);
    return { start, end: addMinutes(start, d.durMin) };
  };

  const finishDrag = (d) => {
    if (d.type === 'create') {
      if (d.moved && d.preview) openCreate(d.preview.start, d.preview.end);
      else openCreate(addMinutes(d.day, d.anchorMin), addMinutes(d.day, Math.min(d.anchorMin + 60, MINUTES_PER_DAY)));
      return;
    }
    if (!d.moved) {
      if (d.item) handleItemClick(d.item);
      else if (d.type === 'tray') onTaskClick(d.task);
      return;
    }
    if (!d.preview) return;
    const { start, end } = d.preview;
    if (d.item && start.getTime() === d.item.start.getTime() && end.getTime() === d.item.end.getTime()) return;
    if (d.item?.kind === 'google') { moveGoogleEvent(d.item, start, end); return; }
    if (d.task) {
      // Bloque inválido: no se guarda y el bloque vuelve a su lugar (el estado no cambió)
      const error = taskDragError(d, d.preview);
      if (error) { setToast({ tone: 'error', msg: error }); return; }
      onScheduleTask(d.task, start, end)
        .then(res => { if (res?.warning) setToast({ tone: 'info', msg: res.warning }); })
        .catch(showError);
    }
  };

  const taskDragError = (d, preview) => preview && validateSchedule(d.task, preview.start, preview.end, {
    now: new Date(), startChanged: d.type !== 'resize',
  });

  const startDrag = (e, init) => {
    e.preventDefault();
    const d0 = { ...init, x0: e.clientX, y0: e.clientY, moved: false, preview: init.preview || null };
    dragRef.current = d0; setDrag(d0);

    const onMove = (ev) => {
      const cur = dragRef.current;
      if (!cur) return;
      if (!cur.moved && Math.hypot(ev.clientX - cur.x0, ev.clientY - cur.y0) < 4) return;
      // Auto-scroll al acercarse a los bordes (solo dentro de la grilla)
      const scroller = scrollRef.current;
      if (scroller && cur.moved) {
        const sr = scroller.getBoundingClientRect();
        const inside = ev.clientX >= sr.left && ev.clientX <= sr.right && ev.clientY >= sr.top && ev.clientY <= sr.bottom;
        if (inside && ev.clientY < sr.top + 24) scroller.scrollTop -= 12;
        else if (inside && ev.clientY > sr.bottom - 24) scroller.scrollTop += 12;
      }
      const next = { ...cur, moved: true };
      next.preview = computePreview(next, slotFromPoint(ev.clientX, ev.clientY));
      next.invalid = Boolean(next.task && taskDragError(next, next.preview));
      dragRef.current = next; setDrag(next);
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    const onUp = () => { cleanup(); const cur = dragRef.current; dragRef.current = null; setDrag(null); if (cur) finishDrag(cur); };
    const onCancel = () => { cleanup(); dragRef.current = null; setDrag(null); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  // Clic o clic+arrastre en un espacio vacío → nuevo evento
  const handleEmptyPointerDown = (e, dayIndex) => {
    const slot = slotFromPoint(e.clientX, e.clientY);
    if (!slot) return;
    const day = startOfDay(dayList[dayIndex]);
    const anchorMin = Math.min(MINUTES_PER_DAY - 15, snapFloor(slot.min));
    startDrag(e, { type: 'create', day, anchorMin, title: 'Nuevo evento' });
  };

  // Mover o estirar un item arrastrable (evento de Google o bloque de tarea)
  const handleItemPointerDown = (e, item, mode) => {
    const slot = slotFromPoint(e.clientX, e.clientY);
    const durMin = Math.round((item.end - item.start) / 60000);
    const offsetMin = slot ? slot.min - minutesOfDay(item.start) : 0;
    startDrag(e, {
      type: mode, item, durMin, offsetMin, task: item.task || null,
      title: item.title, color: item.task ? item.color : C.mutedLt, bg: item.task ? item.bg : '#F1F5F9',
      preview: { start: item.start, end: item.end },
    });
  };

  // Chip de la bandeja → bloque de 1 h donde se suelta
  const handleTrayPointerDown = (e, task) => {
    const cfg = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.otro;
    startDrag(e, { type: 'tray', task, durMin: 60, offsetMin: 15, title: task.title, color: cfg.color, bg: cfg.bg });
  };

  // Pendientes o en proceso sin horario, por fecha límite más cercana
  const unscheduled = useMemo(() => tasks
    .filter(t => t.status !== 'completed' && !t.scheduled_start)
    .sort((a, b) => (a.due_date ? new Date(a.due_date) : Infinity) - (b.due_date ? new Date(b.due_date) : Infinity)),
  [tasks]);

  const navBtn = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32, minWidth: 32, padding: '0 10px',
    borderRadius: '8px', border: '1.5px solid ' + C.border, background: C.surface, color: C.navy,
    fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
  };

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
            {[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([m, label]) => (
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

      <ScheduleTray tasks={unscheduled} now={now} dragEnabled={mode !== 'month'}
        draggingTaskId={drag?.type === 'tray' ? drag.task.id : null} onChipPointerDown={handleTrayPointerDown} />

      {mode === 'month' ? (
        <MonthGrid cursor={cursor} days={dayList} itemsByDay={monthByDay} today={today}
          onDayClick={onDayClick} onItemClick={handleItemClick}
          onMore={d => { setCursor(d); setMode('day'); }} />
      ) : (
        <TimeGrid days={dayList} timedItems={timedItems} allDayByDay={allDayByDay} now={now} drag={drag}
          scrollRef={scrollRef} columnsRef={columnsRef}
          onEmptyPointerDown={handleEmptyPointerDown} onItemPointerDown={handleItemPointerDown} onItemClick={handleItemClick} />
      )}

      {eventModal && (
        <EventModal initial={eventModal.initial} isEdit={Boolean(eventModal.item)}
          onSave={saveEvent} onClose={() => setEventModal(null)} />
      )}
      {eventDetail && (
        <EventDetail item={eventDetail} onClose={() => setEventDetail(null)} onDelete={deleteEvent}
          onEdit={item => {
            setEventDetail(null);
            setEventModal({ item, initial: { title: item.event.summary, description: item.event.description, location: item.event.location, start: item.start, end: item.end } });
          }} />
      )}
      {connectPrompt && (
        <div onClick={() => setConnectPrompt(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: '18px', maxWidth: 380, padding: 24, border: '1.5px solid ' + C.border, boxShadow: '0 24px 64px rgba(27,58,107,0.22)', textAlign: 'center', animation: 'slideDown 0.15s ease-out' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CalendarIcon size={20} color={C.blue} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: C.navy, marginBottom: 6 }}>
              {google?.status === 'expired' ? 'La sesión de Google expiró' : 'Conecta Google Calendar'}
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: C.muted, lineHeight: 1.5 }}>
              {google?.configured
                ? 'Los eventos (reuniones, citas…) se guardan en tu Google Calendar. Conéctalo para crearlos desde aquí.'
                : 'Falta configurar VITE_GOOGLE_CLIENT_ID para poder conectar Google Calendar.'}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setConnectPrompt(false)} style={{ padding: '9px 16px', borderRadius: '20px', border: '1.5px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
              {google?.configured && (
                <button onClick={() => { setConnectPrompt(false); google.connect(); }}
                  style={{ padding: '9px 16px', borderRadius: '20px', border: 'none', background: C.navy, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CalendarIcon size={13} /> Conectar Google Calendar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div role="alert" onClick={() => setToast(null)}
          style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 3000, maxWidth: 520, padding: '12px 18px', borderRadius: '12px',
            background: toast.tone === 'error' ? C.danger : C.navy, color: '#fff', fontSize: '13px', fontWeight: '600', lineHeight: 1.45,
            boxShadow: '0 12px 32px rgba(15,32,64,0.3)', display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', animation: 'slideDown 0.15s ease-out' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />{toast.msg}
        </div>
      )}

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: 14, marginTop: 12, flexWrap: 'wrap', fontSize: '11px', color: C.muted }}>
        {Object.values(CATEGORY_CONFIG).map(cfg => (
          <span key={cfg.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: cfg.bg, borderLeft: '3px solid ' + cfg.color }} />{cfg.label}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.danger }}>⚑ Fecha límite vencida</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: 0.5, textDecoration: 'line-through' }}>Completada</span>
        {googleConnected && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#F1F5F9', border: '1px dashed ' + C.mutedLt }} />Google Calendar
          </span>
        )}
      </div>
    </div>
  );
}
