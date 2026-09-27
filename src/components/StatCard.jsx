import React from 'react';
import { C } from '../lib/shared';

// Tarjeta de indicador reutilizada por el tablero (Tickets) y por Estadísticas.
// pct: 0-100 o null/undefined. Si se omite, no se dibuja la barra de progreso
// (evita inventar un porcentaje sin significado real).
// footer: contenido opcional debajo de la etiqueta (comparaciones, "X de Y", etc.).
export default function StatCard({ icon: Icon, label, value, iconColor, iconBg, accent, sublabel, pct, footer, valueColor }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: '8px',
      padding: '18px 20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      flex: 1,
      minWidth: 0,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(15,32,64,0.05)',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 3px 10px rgba(15,32,64,0.09)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,32,64,0.05)'; }}
    >
      {/* Accent stripe top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accent, borderRadius: '8px 8px 0 0' }} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '13px',
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 4px 12px ${accent}28`,
        }}>
          <Icon size={20} color={iconColor} />
        </div>
        {sublabel && (
          <div style={{
            fontSize: '10px', fontWeight: '700', color: accent,
            background: `${accent}14`,
            padding: '3px 9px', borderRadius: '20px',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            border: `1px solid ${accent}30`,
            textAlign: 'right',
          }}>
            {sublabel}
          </div>
        )}
      </div>

      {/* Number */}
      <div>
        <div style={{
          fontSize: '32px', fontWeight: '700', color: valueColor || C.navy,
          letterSpacing: '-0.03em', lineHeight: 1,
        }}>{value}</div>
        <div style={{ fontSize: '11px', color: C.muted, fontWeight: '500', marginTop: 4 }}>{label}</div>
        {footer && <div style={{ marginTop: 6 }}>{footer}</div>}
      </div>

      {/* Progress bar (solo si se pasa un pct real) */}
      {pct !== null && pct !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'auto' }}>
          <div style={{ height: 5, background: `${accent}18`, borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, pct))}%`,
              background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
              borderRadius: '10px',
              transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
              minWidth: pct > 0 ? undefined : '4px',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
