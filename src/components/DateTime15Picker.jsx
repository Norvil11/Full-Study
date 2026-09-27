import React, { useState, useEffect } from 'react';
import { C } from '../lib/shared';
import { TIME_OPTIONS_15, toDateInput, fmtTime, fromDateAndTime, addDays } from '../lib/dates';

const baseInput = {
  height: '44px', padding: '0 12px', borderRadius: '10px', border: '1.5px solid ' + C.border,
  background: C.surface, color: C.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

// Horas válidas para una fecha: si no se permite el pasado, en el día de hoy solo las futuras
function optionsFor(dateStr, allowPast) {
  if (allowPast || !dateStr) return TIME_OPTIONS_15;
  const today = toDateInput(new Date());
  if (dateStr < today) return [];
  if (dateStr > today) return TIME_OPTIONS_15;
  const nowStr = fmtTime(new Date());
  return TIME_OPTIONS_15.filter(t => t > nowStr);
}

// Select de hora cada 15 min en formato 24 h. `after` ('HH:mm') deja solo horas posteriores;
// `includeMidnight` agrega '24:00' (útil como hora de fin).
export function TimeSelect15({ value, onChange, options = TIME_OPTIONS_15, after = null, includeMidnight = false, style, disabled, placeholder = '--:--' }) {
  let opts = after ? options.filter(t => t > after) : options;
  if (includeMidnight) opts = [...opts, '24:00'];
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{ ...baseInput, cursor: disabled ? 'not-allowed' : 'pointer', appearance: 'none', minWidth: 96, ...style }}>
      {!value && <option value="">{placeholder}</option>}
      {opts.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

// Fecha (input date) + hora (select cada 15 min). value/onChange usan Date | null.
// - allowPast=false: no deja elegir fechas u horas pasadas.
// - defaultTime: hora que se usa si solo se elige la fecha.
export default function DateTime15Picker({ value, onChange, allowPast = false, defaultTime = '23:45', inputStyle, selectStyle, clearable = true }) {
  const [dateStr, setDateStr] = useState(value ? toDateInput(value) : '');
  const [timeStr, setTimeStr] = useState(value ? fmtTime(value) : '');

  // Sincronizar si el valor cambia desde fuera
  useEffect(() => {
    if (value) { setDateStr(toDateInput(value)); setTimeStr(fmtTime(value)); }
  }, [value?.getTime()]);

  const todayStr = toDateInput(new Date());
  const minDate = allowPast ? undefined
    : optionsFor(todayStr, false).length ? todayStr : toDateInput(addDays(new Date(), 1));
  const options = optionsFor(dateStr, allowPast);
  const pastDate = Boolean(dateStr) && !allowPast && options.length === 0;

  const emit = (d, t) => {
    if (!d) { onChange(null); return; }
    const opts = optionsFor(d, allowPast);
    const time = opts.includes(t) ? t : opts.includes(defaultTime) ? defaultTime : opts[0];
    if (!time) { onChange(null); return; }
    setTimeStr(time);
    onChange(fromDateAndTime(d, time));
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="date" value={dateStr} min={minDate} required={!clearable}
          onChange={e => { setDateStr(e.target.value); emit(e.target.value, timeStr || defaultTime); }}
          style={{ ...baseInput, flex: 1, minWidth: 0, borderColor: pastDate ? C.danger : C.border, ...inputStyle }} />
        <TimeSelect15 value={options.includes(timeStr) ? timeStr : ''} options={options} style={selectStyle}
          disabled={!dateStr || pastDate}
          onChange={t => { setTimeStr(t); if (dateStr) emit(dateStr, t); }} />
      </div>
      {pastDate && <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.danger, fontWeight: '600' }}>Elige una fecha que no esté en el pasado.</p>}
    </div>
  );
}
