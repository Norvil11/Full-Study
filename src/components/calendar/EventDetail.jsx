import React, { useState } from 'react';
import { X, Clock, MapPin, Repeat, ExternalLink, Edit2, Trash2, Loader2 } from 'lucide-react';
import { C } from '../../lib/shared';
import { fmtRange, fmtDateShort, addDays } from '../../lib/dates';

// Detalle de un evento de Google. Los recurrentes solo se abren en Google Calendar.
export default function EventDetail({ item, onEdit, onDelete, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [error, setError]           = useState('');
  const ev = item.event;
  const editable = item.editable;                      // propio, no recurrente, con hora y de un solo día
  const canDelete = item.own && !item.recurring;

  const when = item.allDay
    ? 'Todo el día · ' + fmtDateShort(item.start) + (item.end - item.start > 86400000 ? ' – ' + fmtDateShort(addDays(item.end, -1)) : '')
    : fmtRange(item.start, item.end);

  const handleDelete = async () => {
    setDeleting(true); setError('');
    try { await onDelete(item); onClose(); }
    catch (err) { setError(err.message || 'No se pudo eliminar.'); setDeleting(false); }
  };

  const btn = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: C.surface, borderRadius: '18px', width: '100%', maxWidth: 400, border: '1.5px solid ' + C.border, boxShadow: '0 24px 64px rgba(27,58,107,0.22)', padding: 20, animation: 'slideDown 0.15s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: '#F1F5F9', border: '1.5px dashed ' + C.mutedLt, marginTop: 5, flexShrink: 0 }} />
          <h3 style={{ margin: 0, flex: 1, fontSize: '17px', fontWeight: '800', color: C.navy, lineHeight: 1.3, wordBreak: 'break-word' }}>{item.title}</h3>
          <button onClick={onClose} style={{ background: C.bg, border: 'none', borderRadius: '8px', padding: 6, cursor: 'pointer', color: C.muted, display: 'flex' }}><X size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '14px 0 16px 22px', fontSize: '13px', color: C.text }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={14} color={C.muted} />{when}</div>
          {ev.location && <div style={{ display: 'flex', alignItems: 'center', gap: 8, wordBreak: 'break-word' }}><MapPin size={14} color={C.muted} />{ev.location}</div>}
          {item.recurring && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.violet, fontWeight: '700' }}>
              <Repeat size={14} /> Evento recurrente
            </div>
          )}
          {ev.description && (
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: C.muted, background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '8px 10px', maxHeight: 160, overflowY: 'auto' }}>
              {ev.description.replace(/<[^>]+>/g, '')}
            </div>
          )}
          {item.recurring && <div style={{ fontSize: '11px', color: C.muted }}>Los eventos recurrentes se editan desde Google Calendar.</div>}
          {!item.own && !item.recurring && <div style={{ fontSize: '11px', color: C.muted }}>Eres invitado: solo el organizador puede cambiar este evento.</div>}
        </div>

        {error && <div style={{ padding: '8px 12px', marginBottom: 12, background: C.dangerLt, borderRadius: '8px', color: C.danger, fontSize: '12px', fontWeight: '600' }}>{error}</div>}

        {confirming ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '12px', color: C.text, marginRight: 'auto' }}>¿Eliminar este evento de Google Calendar?</span>
            <button onClick={() => setConfirming(false)} style={{ ...btn, border: '1.5px solid ' + C.border, background: 'transparent', color: C.muted }}>No</button>
            <button onClick={handleDelete} disabled={deleting} style={{ ...btn, border: 'none', background: C.danger, color: '#fff' }}>
              {deleting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />} Eliminar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ev.htmlLink && (
              <a href={ev.htmlLink} target="_blank" rel="noopener noreferrer" style={{ ...btn, border: '1.5px solid ' + C.border, background: C.surface, color: C.navy, marginRight: 'auto' }}>
                <ExternalLink size={12} /> Abrir en Google Calendar
              </a>
            )}
            {editable && (
              <button onClick={() => onEdit(item)} style={{ ...btn, border: '1.5px solid ' + C.accentLt, background: C.accentLt, color: C.navy }}><Edit2 size={12} /> Editar</button>
            )}
            {canDelete && (
              <button onClick={() => setConfirming(true)} style={{ ...btn, border: '1.5px solid ' + C.dangerLt, background: C.dangerLt, color: C.danger }}><Trash2 size={12} /> Eliminar</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
