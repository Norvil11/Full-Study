import React from 'react';
import { Check } from 'lucide-react';
import { C } from '../lib/shared';
import { usePalette, colorHex, colorName, textOn } from '../lib/colors';

// Fila de círculos con la paleta de Google + la opción por defecto (value = null).
// value: colorId ('1'…'11') o null; defaultColor: hex que representa la opción por defecto.
export default function ColorPicker({ value, onChange, defaultLabel = 'Predeterminado', defaultColor, size = 22, disabled = false }) {
  const { colorIds } = usePalette();
  const options = [{ id: null, hex: defaultColor, name: defaultLabel }, ...colorIds.map(id => ({ id, hex: colorHex(id), name: colorName(id) }))];

  return (
    <div role="radiogroup" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', opacity: disabled ? 0.6 : 1 }}>
      {options.map(opt => {
        const selected = (value || null) === opt.id;
        return (
          <button key={opt.id || 'default'} type="button" role="radio" aria-checked={selected} aria-label={opt.name} title={opt.name}
            disabled={disabled} onClick={() => { if (!selected) onChange(opt.id); }}
            style={{
              width: size, height: size, borderRadius: '50%', padding: 0, cursor: disabled ? 'not-allowed' : 'pointer',
              background: opt.hex, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              border: opt.id === null ? '2px solid ' + C.surface : 'none',
              boxShadow: selected ? '0 0 0 2px ' + C.surface + ', 0 0 0 4px ' + opt.hex : opt.id === null ? '0 0 0 1.5px ' + C.border : 'none',
              marginRight: opt.id === null ? 6 : 0, transition: 'transform 0.1s',
            }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'scale(1.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
            {selected && <Check size={size * 0.6} color={textOn(opt.hex)} strokeWidth={3} />}
          </button>
        );
      })}
      <span style={{ fontSize: '11px', color: C.muted, marginLeft: 4 }}>
        {value ? colorName(value) : defaultLabel}
      </span>
    </div>
  );
}
