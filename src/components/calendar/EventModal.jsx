import React, { useState } from 'react';
import { X, Loader2, Save, MapPin } from 'lucide-react';
import { C } from '../../lib/shared';
import { fmtTime, toDateInput, fromDateAndTime, addMinutes, sameDay } from '../../lib/dates';
import DateTime15Picker, { TimeSelect15 } from '../DateTime15Picker';

const lbl = { display: 'block', fontSize: '11px', fontWeight: '700', color: C.navy, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' };
const inp = { width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid ' + C.border, background: C.surface, color: C.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

// Fin a medianoche del día siguiente se muestra como '24:00'
const endLabel = (start, end) => (sameDay(start, end) ? fmtTime(end) : '24:00');

// Crear o editar un evento con hora de Google Calendar.
// initial: { title, description, location, start: Date, end: Date }
export default function EventModal({ initial, isEdit = false, onSave, onClose }) {
  const [title, setTitle]             = useState(initial.title || '');
  const [description, setDescription] = useState(initial.description || '');
  const [location, setLocation]       = useState(initial.location || '');
  const [start, setStart]             = useState(initial.start);
  const [endStr, setEndStr]           = useState(endLabel(initial.start, initial.end));
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const startStr = start ? fmtTime(start) : null;

  const handleStart = (d) => {
    setStart(d);
    // Si la hora de fin queda antes del inicio, mantener 1 h de duración
    if (d && endStr <= fmtTime(d)) {
      const e = addMinutes(d, 60);
      setEndStr(toDateInput(e) !== toDateInput(d) ? '24:00' : fmtTime(e));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError('El título es obligatorio.');
    if (!start) return setError('Elige la fecha y la hora de inicio.');
    const end = fromDateAndTime(toDateInput(start), endStr);
    if (end <= start) return setError('La hora de fin debe ser posterior a la de inicio.');
    setSaving(true); setError('');
    try {
      await onSave({ title: title.trim(), description: description.trim(), location: location.trim(), start, end });
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el evento.');
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: 16 }}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit}
        style={{ background: C.surface, borderRadius: '18px', width: '100%', maxWidth: 420, border: '1.5px solid ' + C.border, boxShadow: '0 24px 64px rgba(27,58,107,0.22)', overflow: 'hidden', animation: 'slideDown 0.15s ease-out' }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid ' + C.border }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: C.navy }}>{isEdit ? 'Editar evento' : 'Nuevo evento'}</h3>
          <button type="button" onClick={onClose} style={{ background: C.bg, border: 'none', borderRadius: '8px', padding: 6, cursor: 'pointer', color: C.muted, display: 'flex' }}><X size={15} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Título *</label>
            <input autoFocus style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Reunión con el equipo" />
          </div>
          <div>
            <label style={lbl}>Fecha y hora de inicio</label>
            <DateTime15Picker value={start} onChange={handleStart} allowPast defaultTime="09:00" clearable={false}
              inputStyle={{ height: 42 }} selectStyle={{ height: 42 }} />
          </div>
          <div>
            <label style={lbl}>Hora de fin</label>
            <TimeSelect15 value={endStr} onChange={setEndStr} after={startStr} includeMidnight style={{ height: 42, width: 120 }} />
          </div>
          <div>
            <label style={lbl}><MapPin size={10} style={{ verticalAlign: '-1px' }} /> Ubicación <span style={{ textTransform: 'none', fontWeight: '400', color: C.muted, letterSpacing: 0 }}>(opcional)</span></label>
            <input style={inp} value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Sala 3 o enlace de Meet" />
          </div>
          <div>
            <label style={lbl}>Descripción <span style={{ textTransform: 'none', fontWeight: '400', color: C.muted, letterSpacing: 0 }}>(opcional)</span></label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
              style={{ ...inp, height: 'auto', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          {error && <div style={{ padding: '8px 12px', background: C.dangerLt, borderRadius: '8px', color: C.danger, fontSize: '12px', fontWeight: '600' }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', borderRadius: '20px', border: '1.5px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={saving}
              style={{ padding: '9px 20px', borderRadius: '20px', border: 'none', background: 'linear-gradient(135deg, ' + C.navy + ', ' + C.blue + ')', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.75 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
              {saving ? 'Guardando...' : 'Guardar en Google'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
