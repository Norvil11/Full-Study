import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { C, CATEGORY_CONFIG, isOverdue } from './lib/shared';
import { useGoogleCalendar, taskEventBody } from './lib/googleCalendar';
import CalendarView from './components/CalendarView';
import { fmtRange, fmtDateTime, fmtTime } from './lib/dates';
import DateTime15Picker from './components/DateTime15Picker';
import {
  Eye, EyeOff, LogOut, Plus, Calendar,
  CheckCircle2, Clock, AlertCircle, Trash2,
  X, AlertTriangle, Loader2, Send,
  LayoutDashboard,
  Zap, FileText,
  Upload, Paperclip, ExternalLink, ChevronRight,
  Camera, User, Edit2, Save, Trash, CalendarClock,
} from 'lucide-react';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const BG_IMAGE = "https://img.magnific.com/foto-gratis/colegas-sonrientes-tiro-medio-trabajo_23-2149308453.jpg?semt=ais_hybrid&w=740&q=80";

const PRIORITY_CONFIG = {
  low:    { label: 'Baja',    color: C.accent,  bg: C.accentLt,  border: '#BFDBFE' },
  medium: { label: 'Media',   color: C.warn,    bg: C.warnLt,    border: '#FDE68A' },
  high:   { label: 'Alta',    color: C.danger,  bg: C.dangerLt,  border: '#FECACA' },
  urgent: { label: 'Urgente', color: C.violet,  bg: C.violetLt,  border: '#DDD6FE' },
};

const STATUS_COLS = [
  { status: 'pending',     label: 'Por Hacer',  dot: C.mutedLt,  tag: '#F1F5F9',   tagText: C.muted   },
  { status: 'in_progress', label: 'En Proceso', dot: C.blue,     tag: C.accentLt,  tagText: C.navy    },
  { status: 'completed',   label: 'Completado', dot: C.success,  tag: C.successLt, tagText: C.success },
];

// Solo para "Mis Pendientes" — sin columna completado
const STATUS_COLS_MINE = [
  { status: 'pending',     label: 'Por Hacer',  dot: C.mutedLt,  tag: '#F1F5F9',   tagText: C.muted   },
  { status: 'in_progress', label: 'En Proceso', dot: C.blue,     tag: C.accentLt,  tagText: C.navy    },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}
// Fecha límite con hora: "27 sep 2026, 18:00"
function formatDueDate(d) {
  return d ? fmtDateTime(new Date(d)) : '—';
}
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}
function getDaysUntil(due) {
  if (!due) return null;
  const diff = new Date(due) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function Chip({ children, color, bg, border }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.03em', color, background: bg, border: `1px solid ${border}` }}>
      {children}
    </span>
  );
}

function CategoryChip({ category }) {
  const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.otro;
  const Ic = cfg.icon;
  return (
    <Chip color={cfg.color} bg={cfg.bg} border={cfg.border}>
      <Ic size={9} style={{ marginRight: 3 }} />{cfg.label}
    </Chip>
  );
}

// ─── PROFILE MENU ─────────────────────────────────────────────────────────────
function ProfileMenu({ profile, currentUserId, onClose, onProfileUpdated }) {
  const [tab, setTab] = useState('info');
  const [editForm, setEditForm] = useState({
    first_name: profile?.first_name || '',
    last_name:  profile?.last_name  || '',
    cargo:      profile?.cargo      || '',
  });
  const [saving,   setSaving]   = useState(false);
  const [saveMsg,  setSaveMsg]  = useState('');
  const [saveErr,  setSaveErr]  = useState('');
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileRef = useRef();

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    const ext  = file.name.split('.').pop();
    const path = 'avatars/' + currentUserId + '.' + ext;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { setSaveErr('Error subiendo foto: ' + upErr.message); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const { data: updated } = await supabase
      .from('profiles').update({ avatar_url: urlData.publicUrl })
      .eq('id', currentUserId).select().single();
    if (updated) { onProfileUpdated(updated); setSaveMsg('Foto actualizada'); setShowPhotoMenu(false); }
  };

  const handleDeletePhoto = async () => {
    const { data: updated } = await supabase
      .from('profiles').update({ avatar_url: null })
      .eq('id', currentUserId).select().single();
    if (updated) { onProfileUpdated(updated); setSaveMsg('Foto eliminada'); setShowPhotoMenu(false); }
  };

  const handleSave = async () => {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      setSaveErr('Nombre y apellido son obligatorios.'); return;
    }
    setSaving(true); setSaveErr(''); setSaveMsg('');
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ first_name: editForm.first_name.trim(), last_name: editForm.last_name.trim(), cargo: editForm.cargo.trim() })
      .eq('id', currentUserId).select().single();
    setSaving(false);
    if (error) { setSaveErr(error.message); return; }
    if (updated) { onProfileUpdated(updated); setSaveMsg('¡Cambios guardados!'); setTab('info'); }
  };

  const inp = {
    width: '100%', height: '40px', padding: '0 12px',
    borderRadius: '8px', border: '1.5px solid ' + C.border,
    background: C.bg, color: C.text, fontSize: '13px',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onClose} />
      <div style={{
        position: 'absolute', right: 0, top: 'calc(100% + 10px)',
        background: C.surface, borderRadius: '20px', width: '300px',
        border: '1.5px solid ' + C.border,
        boxShadow: '0 16px 48px rgba(27,58,107,0.18)',
        overflow: 'hidden', zIndex: 200,
        animation: 'slideDown 0.15s ease-out',
      }}>
        {/* Header con foto */}
        <div style={{ background: 'linear-gradient(135deg, ' + C.navy + ' 0%, ' + C.blue + ' 100%)', padding: '20px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>

            {/* Foto cuadrada con object-fit cover desde arriba */}
            <div style={{ width: 72, height: 72, borderRadius: '16px', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.3)', display: 'inline-block' }}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: C.accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', color: C.navy }}>
                  {initials(profile?.full_name || '')}
                </div>
              )}
            </div>

            {/* Botón editar foto */}
            <button
              onClick={() => setShowPhotoMenu(v => !v)}
              style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', background: C.gold, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
              <Camera size={11} color="#fff" />
            </button>

            {/* Menú editar/eliminar foto */}
            {showPhotoMenu && (
              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: C.surface, borderRadius: '12px', border: '1.5px solid ' + C.border, boxShadow: '0 8px 24px rgba(27,58,107,0.18)', overflow: 'hidden', zIndex: 10, minWidth: 160 }}>
                <button
                  onClick={() => { setShowPhotoMenu(false); fileRef.current?.click(); }}
                  style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: C.navy, fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid ' + C.border }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Camera size={13} color={C.accent} /> Editar foto
                </button>
                <button
                  onClick={handleDeletePhoto}
                  style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: C.danger, fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.background = C.dangerLt}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Trash size={13} color={C.danger} /> Eliminar foto
                </button>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => handlePhotoUpload(e.target.files[0])} />

          <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff' }}>{profile?.full_name}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{profile?.email}</div>
          {profile?.cargo && (
            <div style={{ marginTop: 6, display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
              {profile.cargo}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid ' + C.border }}>
          {[['info', 'Mi perfil', User], ['edit', 'Editar', Edit2]].map(([id, label, Ic]) => (
            <button key={id} onClick={() => { setTab(id); setSaveMsg(''); setSaveErr(''); }}
              style={{
                flex: 1, padding: '11px 0', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '12px', fontWeight: '700',
                background: tab === id ? C.accentLt : 'transparent',
                color: tab === id ? C.navy : C.muted,
                borderBottom: tab === id ? '2px solid ' + C.blue : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
              <Ic size={12} />{label}
            </button>
          ))}
        </div>

        <div style={{ padding: '16px' }}>
          {tab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {saveMsg && (
                <div style={{ padding: '8px 12px', background: C.successLt, borderRadius: '8px', color: C.success, fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={13} />{saveMsg}
                </div>
              )}
              {[
                { label: 'Nombre completo', value: profile?.full_name },
                { label: 'Correo',          value: profile?.email     },
                { label: 'Cargo',           value: profile?.cargo     },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: C.bg, borderRadius: '10px', padding: '10px 12px', border: '1px solid ' + C.border }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: C.mutedLt, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: C.navy }}>{value || '—'}</div>
                </div>
              ))}
              <button onClick={() => setTab('edit')}
                style={{ width: '100%', padding: '9px', borderRadius: '10px', border: '1.5px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                <Edit2 size={12} /> Editar información
              </button>
            </div>
          )}

          {tab === 'edit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {saveMsg && (
                <div style={{ padding: '8px 12px', background: C.successLt, borderRadius: '8px', color: C.success, fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={13} />{saveMsg}
                </div>
              )}
              {saveErr && (
                <div style={{ padding: '8px 12px', background: C.dangerLt, borderRadius: '8px', color: C.danger, fontSize: '12px', fontWeight: '600' }}>
                  {saveErr}
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: C.navy, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombres</label>
                <input style={inp} value={editForm.first_name}
                  onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                  onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.background = '#fff'; }}
                  onBlur={e =>  { e.target.style.borderColor = C.border; e.target.style.background = C.bg; }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: C.navy, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Apellidos</label>
                <input style={inp} value={editForm.last_name}
                  onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                  onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.background = '#fff'; }}
                  onBlur={e =>  { e.target.style.borderColor = C.border; e.target.style.background = C.bg; }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: C.navy, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cargo <span style={{ textTransform: 'none', fontWeight: '400', color: C.muted, letterSpacing: 0 }}>(opcional)</span></label>
                <input style={inp} value={editForm.cargo} placeholder="Ej: Estudiante, Desarrollador..."
                  onChange={e => setEditForm(f => ({ ...f, cargo: e.target.value }))}
                  onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.background = '#fff'; }}
                  onBlur={e =>  { e.target.style.borderColor = C.border; e.target.style.background = C.bg; }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setTab('info')}
                  style={{ flex: 1, padding: '9px', borderRadius: '10px', border: '1.5px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{ flex: 1, padding: '9px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, ' + C.navy + ', ' + C.blue + ')', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: saving ? 0.75 : 1 }}>
                  {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── TASK DETAIL MODAL ────────────────────────────────────────────────────────
function TaskDetailModal({ task, onClose, onStatusChange, onDelete, onUnschedule }) {
  const [unscheduling, setUnscheduling] = useState(false);
  if (!task) return null;
  const overdue   = isOverdue(task.due_date, task.status);
  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const sCfg = STATUS_COLS.find(s => s.status === task.status) || STATUS_COLS[0];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.60)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div style={{ background: C.surface, borderRadius: '24px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', border: `1.5px solid ${C.border}`, boxShadow: '0 32px 80px rgba(27,58,107,0.22)' }}>
        <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`, borderRadius: '22px 22px 0 0', padding: '28px 28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontWeight: '600' }}>#{task.id.substring(0, 8).toUpperCase()}</span>
                <CategoryChip category={task.category} />
                <Chip color={pCfg.color} bg={pCfg.bg} border={pCfg.border}>{pCfg.label}</Chip>
                <span style={{ fontSize: '10px', padding: '2px 9px', borderRadius: '20px', background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: '700' }}>{sCfg.label}</span>
                {overdue && <Chip color={C.danger} bg={C.dangerLt} border="#FECACA">Vencida</Chip>}
              </div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#fff', lineHeight: '1.3' }}>{task.title}</h2>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#fff', display: 'flex', marginLeft: 12, flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: '28px' }}>
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: '700', color: C.navy, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Descripción</h4>
            {task.description ? (() => {
              const lines = task.description.split('\n');
              const linkLine = lines.find(l => l.startsWith('🔗 '));
              const linkUrl  = linkLine ? linkLine.replace('🔗 ', '').trim() : null;
              const bodyText = lines.filter(l => !l.startsWith('🔗 ')).join('\n').trim();
              const renderMd = (text) => text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2,-2)}</strong>;
                if (part.startsWith('_')  && part.endsWith('_'))  return <em key={i}>{part.slice(1,-1)}</em>;
                return <span key={i}>{part}</span>;
              });
              return (
                <div style={{ background: C.bg, padding: '16px', borderRadius: '12px', border: '1px solid ' + C.border, wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', maxWidth: '100%', overflowX: 'hidden' }}>
                  {bodyText && <p style={{ margin: 0, fontSize: '14px', color: C.text, lineHeight: '1.75' }}>{renderMd(bodyText)}</p>}
                  {linkUrl && (
                    <a href={linkUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: bodyText ? 10 : 0, fontSize: '13px', color: C.blue, fontWeight: '600', textDecoration: 'none', wordBreak: 'break-all' }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                      <ExternalLink size={13} /> {linkUrl}
                    </a>
                  )}
                </div>
              );
            })()
            : <p style={{ margin: 0, fontSize: '13px', color: C.mutedLt, fontStyle: 'italic' }}>Sin descripción</p>
            }
          </div>

          {task.file_url && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: '700', color: C.navy, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Archivo adjunto</h4>
              <a href={task.file_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: '10px', border: `1.5px solid ${C.accentLt}`, background: C.accentLt, color: C.navy, fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                <Paperclip size={14} color={C.accent} />
                {task.file_name || 'Ver archivo adjunto'}
                <ExternalLink size={12} color={C.muted} />
              </a>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Fecha límite', content: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: overdue ? C.danger : C.text }}>
                  {overdue ? <AlertTriangle size={14} /> : <Calendar size={14} color={C.accent} />}
                  <span style={{ fontSize: '13px', fontWeight: overdue ? '700' : '500' }}>{formatDueDate(task.due_date)}</span>
                </div>
              )},
              { label: 'Creado el', content: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Clock size={14} color={C.accent} />
                  <span style={{ fontSize: '13px', color: C.text }}>{formatDate(task.created_at)}</span>
                </div>
              )},
            ].map(({ label, content }) => (
              <div key={label} style={{ background: C.bg, borderRadius: '12px', padding: '14px 16px', border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: C.mutedLt, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
                {content}
              </div>
            ))}
          </div>

          {/* Horario programado (bloque de trabajo en el calendario) */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: '700', color: C.navy, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Horario programado</h4>
            {task.scheduled_start && task.scheduled_end ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: C.accentLt, borderRadius: '12px', border: '1px solid #BFDBFE', flexWrap: 'wrap' }}>
                <CalendarClock size={16} color={C.blue} />
                <span style={{ fontSize: '13px', fontWeight: '700', color: C.navy, flex: 1 }}>
                  {fmtRange(new Date(task.scheduled_start), new Date(task.scheduled_end))}
                </span>
                <button disabled={unscheduling}
                  onClick={async () => { setUnscheduling(true); await onUnschedule(task); setUnscheduling(false); }}
                  style={{ padding: '6px 12px', borderRadius: '20px', border: '1.5px solid ' + C.border, background: C.surface, color: C.muted, fontSize: '12px', fontWeight: '700', cursor: unscheduling ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {unscheduling ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={12} />} Quitar del horario
                </button>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: C.mutedLt, fontStyle: 'italic' }}>
                {task.status === 'completed' ? 'Sin horario' : 'Sin horario — arrástrala desde la bandeja "Por programar" del Calendario.'}
              </p>
            )}
          </div>

          {task.status === 'completed' && task.completed_at && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: C.successLt, borderRadius: '12px', marginBottom: 24, border: `1px solid #BBF7D0` }}>
              <CheckCircle2 size={16} color={C.success} />
              <span style={{ fontSize: '13px', color: C.success, fontWeight: '600' }}>Completado el {formatDate(task.completed_at)}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {task.status !== 'completed' && (
                <>
                  {task.status === 'pending' && (
                    <button onClick={() => { onStatusChange(task.id, 'in_progress'); onClose(); }}
                      style={{ padding: '8px 16px', borderRadius: '20px', border: `1.5px solid ${C.accentLt}`, background: C.accentLt, color: C.navy, fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                      Iniciar tarea
                    </button>
                  )}
                  <button onClick={() => { onStatusChange(task.id, 'completed'); onClose(); }}
                    style={{ padding: '8px 16px', borderRadius: '20px', border: `1.5px solid ${C.successLt}`, background: C.successLt, color: C.success, fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckCircle2 size={13} /> Marcar realizado
                  </button>
                </>
              )}
            </div>
            <button onClick={() => { onDelete(task.id); onClose(); }}
              style={{ padding: '8px 16px', borderRadius: '20px', border: `1.5px solid ${C.dangerLt}`, background: C.dangerLt, color: C.danger, fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TICKET CARD ─────────────────────────────────────────────────────────────
function TicketCard({ task, onStatusChange, onDelete, onViewDetail }) {
  const overdue    = isOverdue(task.due_date, task.status);
  const pCfg   = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const daysLeft   = getDaysUntil(task.due_date);
  const [confirmComplete, setConfirmComplete] = useState(false);

  // Extract link from description if present
  const descLines = (task.description || '').split('\n');
  const linkLine  = descLines.find(l => l.startsWith('🔗 '));
  const linkUrl   = linkLine ? linkLine.replace('🔗 ', '').trim() : null;
  const descText  = descLines.filter(l => !l.startsWith('🔗 ')).join('\n').trim();

  // Render markdown-lite: **bold** and _italic_
  const renderDesc = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**'))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith('_') && part.endsWith('_'))
        return <em key={i}>{part.slice(1, -1)}</em>;
      return <span key={i}>{part}</span>;
    });
  };

  const handleComplete = () => {
    if (task.status === 'in_progress') {
      setConfirmComplete(true);
    } else {
      onStatusChange(task.id, 'completed');
    }
  };

  return (
    <div style={{
      background: C.surface, border: '1px solid ' + (overdue ? '#FCA5A5' : C.border),
      borderLeft: '3px solid ' + pCfg.color, borderRadius: '6px', padding: '14px', marginBottom: '8px',
      boxShadow: overdue ? '0 1px 4px rgba(220,38,38,0.06)' : '0 1px 2px rgba(15,32,64,0.04)',
      transition: 'box-shadow 0.15s', position: 'relative',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,32,64,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,32,64,0.04)'; }}
    >
      {/* Confirm complete overlay */}
      {confirmComplete && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,15,30,0.5)', backdropFilter: 'blur(3px)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ background: C.surface, borderRadius: '16px', padding: '20px 24px', width: '260px', border: '1.5px solid ' + C.border, boxShadow: '0 8px 32px rgba(27,58,107,0.18)', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: C.navy, marginBottom: 6 }}>¿Marcar como realizado?</div>
            <div style={{ fontSize: '12px', color: C.muted, marginBottom: 16, lineHeight: '1.5' }}>Esta acción cambiará el estado de la tarea a completada.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmComplete(false)}
                style={{ flex: 1, padding: '8px', borderRadius: '10px', border: '1.5px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => { setConfirmComplete(false); onStatusChange(task.id, 'completed'); }}
                style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, ' + C.success + ', #22c55e)', color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <CheckCircle2 size={12} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', color: C.mutedLt, fontFamily: 'monospace', fontWeight: '600' }}>#{task.id.substring(0, 8).toUpperCase()}</span>
            <CategoryChip category={task.category} />
            <Chip color={pCfg.color} bg={pCfg.bg} border={pCfg.border}>{pCfg.label}</Chip>
            {overdue && <Chip color={C.danger} bg={C.dangerLt} border="#FECACA">Vencida</Chip>}
            {task.file_url && <Chip color={C.accent} bg={C.accentLt} border="#BFDBFE"><Paperclip size={9} style={{ marginRight: 3 }} />Adjunto</Chip>}
          </div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: C.navy, lineHeight: '1.35', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{task.title}</h3>
        </div>
        <button onClick={() => onViewDetail(task)}
          style={{ background: C.bg, border: '1px solid ' + C.border, cursor: 'pointer', color: C.muted, padding: '5px 10px', borderRadius: '8px', flexShrink: 0, marginLeft: 8, fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={e => { e.currentTarget.style.background = C.accentLt; e.currentTarget.style.color = C.navy; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.muted; }}
        >Ver <ChevronRight size={11} /></button>
      </div>

      {descText && (
        <p style={{ margin: '0 0 6px', fontSize: '12px', color: C.muted, lineHeight: '1.55', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>
          {renderDesc(descText)}
        </p>
      )}
      {linkUrl && (
        <a href={linkUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '11px', color: C.blue, fontWeight: '600', marginBottom: 8, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
          <ExternalLink size={11} /> {linkUrl.length > 50 ? linkUrl.substring(0, 50) + '...' : linkUrl}
        </a>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: C.muted, marginBottom: 12 }}>
        {task.due_date && task.status !== 'completed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: overdue ? C.danger : daysLeft !== null && daysLeft <= 2 ? C.warn : C.muted, fontWeight: overdue ? '700' : daysLeft !== null && daysLeft <= 2 ? '600' : '400' }}>
            {overdue ? <AlertTriangle size={11} /> : <Calendar size={11} />}
            {overdue ? 'Vencido: ' + formatDueDate(task.due_date)
              : daysLeft === 0 ? '⚡ Vence hoy, ' + fmtTime(new Date(task.due_date))
              : daysLeft === 1 ? '⚠️ Vence mañana, ' + fmtTime(new Date(task.due_date))
              : (daysLeft !== null && daysLeft <= 3 ? '⚠️ ' : '') + 'Vence: ' + formatDueDate(task.due_date)}
          </div>
        )}
      </div>

      {/* Buttons — unified logic to avoid duplicates */}
      {task.status !== 'completed' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {task.status === 'pending' && (
            <button onClick={() => onStatusChange(task.id, 'in_progress')}
              style={{ padding: '5px 12px', borderRadius: '20px', border: '1.5px solid ' + C.accentLt, background: C.accentLt, color: C.navy, fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
              Iniciar tarea
            </button>
          )}
          <button onClick={handleComplete}
            style={{ padding: '5px 12px', borderRadius: '20px', border: '1.5px solid ' + C.successLt, background: C.successLt, color: C.success, fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} /> Marcar realizado
          </button>
          <button onClick={() => onDelete(task.id)}
            style={{ padding: '5px 12px', borderRadius: '20px', border: '1.5px solid ' + C.dangerLt, background: C.dangerLt, color: C.danger, fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Trash2 size={11} /> Eliminar
          </button>
        </div>
      )}

      {task.status === 'completed' && task.completed_at && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.success, fontSize: '11px', fontWeight: '600' }}>
            <CheckCircle2 size={13} />
            Completado el {formatDate(task.completed_at)}
          </div>
          <button onClick={() => onDelete(task.id)}
            style={{ padding: '4px 10px', borderRadius: '20px', border: '1.5px solid ' + C.dangerLt, background: C.dangerLt, color: C.danger, fontSize: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Trash2 size={10} /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── NEW TASK MODAL ───────────────────────────────────────────────────────────
function NewTaskModal({ currentUserId, onClose, onCreated, initialDueDate = null }) {
  const [form, setForm] = useState({
    title: '', description: '', link: '', category: 'otro', priority: 'medium', due_date: initialDueDate
  });
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef = useRef();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ];

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setError('Solo se permiten archivos PDF, Excel, CSV, PNG o JPG.');
        return;
      }
      if (f.size > 10 * 1024 * 1024) { setError('El archivo no puede superar 10 MB.'); return; }
      setFile(f); setError('');
    }
  };

  // Toolbar actions for description textarea
  const descRef = useRef();
  const applyFormat = (tag) => {
    const el = descRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    const selected = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).toString() : '';
    let wrap = '';
    if (tag === 'bold')   wrap = '**' + (selected || 'texto') + '**';
    if (tag === 'italic') wrap = '_'  + (selected || 'texto') + '_';
    document.execCommand('insertText', false, wrap);
    set('description', el.innerText);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('El título es obligatorio.');
    if (!CATEGORY_CONFIG[form.category]) return setError('Selecciona el tipo de tarea.');
    if (form.description.length > 1000) return setError('La descripción no puede superar 1000 caracteres.');
    if (form.due_date && form.due_date < new Date()) {
      return setError('Elige una fecha válida. La fecha límite no puede ser anterior a la actual.');
    }
    setLoading(true); setError('');
    let fileUrl = null, fileName = null;
    if (file) {
      const ext = file.name.split('.').pop();
      const path = 'tasks/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
      const { error: upErr } = await supabase.storage.from('task-files').upload(path, file);
      if (upErr) { setLoading(false); return setError('Error subiendo archivo: ' + upErr.message); }
      const { data: urlData } = supabase.storage.from('task-files').getPublicUrl(path);
      fileUrl = urlData.publicUrl; fileName = file.name;
    }

    // Combine description + link if provided
    const fullDesc = form.description.trim()
      ? (form.link.trim() ? form.description.trim() + '\n\n🔗 ' + form.link.trim() : form.description.trim())
      : (form.link.trim() ? '🔗 ' + form.link.trim() : null);

    const dueIso = form.due_date ? form.due_date.toISOString() : null;
    const newTask = {
      title: form.title.trim(), description: fullDesc,
      assigned_to: currentUserId, category: form.category, priority: form.priority,
      due_date: dueIso, created_by: currentUserId, status: 'pending',
      file_url: fileUrl, file_name: fileName,
    };

    const { data, error: err } = await supabase.from('tasks').insert([newTask]).select().single();
    setLoading(false);
    if (err) return setError(err.message);
    onCreated(data); onClose();
  };


  const sel = { width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: '1.5px solid ' + C.border, background: C.surface, color: C.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit' };
  const inp = { width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: '1.5px solid ' + C.border, background: C.surface, color: C.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lbl = { display: 'block', fontSize: '11px', fontWeight: '700', color: C.navy, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' };
  const isImage = (f) => f && f.type && f.type.startsWith('image/');
  const descLen = form.description.length;
  const descOver = descLen > 1000;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: C.surface, borderRadius: '24px', width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', border: '1.5px solid ' + C.border, boxShadow: '0 32px 80px rgba(27,58,107,0.22)' }}>
        <div style={{ background: 'linear-gradient(135deg, ' + C.navy + ' 0%, ' + C.blue + ' 100%)', borderRadius: '22px 22px 0 0', padding: '24px 28px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff' }}>Crear Ticket</h2>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Asigna y define los detalles de la tarea</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#fff', display: 'flex' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '28px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={lbl}>Título *</label>
              <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Diseñar pantalla de login" required
                onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = '0 0 0 3px ' + C.accentLt; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
            </div>

            {/* Description with mini toolbar */}
            <div>
              <label style={lbl}>Descripción <span style={{ textTransform: 'none', fontWeight: '400', color: C.muted, letterSpacing: 0 }}>(máx. 1000 caracteres)</span></label>
              {/* Toolbar */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {[
                  { label: 'N', title: 'Negrita', tag: 'bold',   style: { fontWeight: '900', fontStyle: 'normal', fontFamily: 'serif' } },
                  { label: 'I', title: 'Cursiva', tag: 'italic', style: { fontStyle: 'italic', fontWeight: '500', fontFamily: 'serif' } },
                ].map(btn => (
                  <button key={btn.tag} type="button" onClick={() => applyFormat(btn.tag)} title={btn.title}
                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1.5px solid ' + C.border, background: C.bg, color: C.navy, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', ...btn.style }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.accentLt; e.currentTarget.style.borderColor = C.accent; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; }}>
                    {btn.label}
                  </button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: descOver ? C.danger : C.mutedLt, fontWeight: descOver ? '700' : '400', alignSelf: 'center' }}>
                  {descLen}/1000
                </span>
              </div>
              <div
                ref={descRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Describe tu ticket..."
                onInput={e => {
                  const raw = e.currentTarget.innerText;
                  set('description', raw);
                }}
                style={{
                  minHeight: '110px', padding: '12px 14px',
                  borderRadius: '10px', border: '1.5px solid ' + (descOver ? C.danger : C.border),
                  background: C.surface, color: C.text, fontSize: '14px',
                  lineHeight: '1.7', fontFamily: 'inherit',
                  outline: 'none', wordBreak: 'break-word', overflowWrap: 'break-word',
                  whiteSpace: 'pre-wrap', cursor: 'text',
                }}
                onFocus={e => { if (!descOver) { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.boxShadow = '0 0 0 3px ' + C.accentLt; } }}
                onBlur={e => { e.currentTarget.style.borderColor = descOver ? C.danger : C.border; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {descOver && <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.danger, fontWeight: '600' }}>Has superado el límite de 1000 caracteres.</p>}
            </div>

            {/* Link field */}
            <div>
              <label style={lbl}>🔗 Pega tu link <span style={{ textTransform: 'none', fontWeight: '400', color: C.muted, letterSpacing: 0 }}>(opcional)</span></label>
              <input
                style={{ ...inp, fontFamily: 'monospace', fontSize: '12px' }}
                value={form.link}
                onChange={e => set('link', e.target.value)}
                placeholder="https://docs.google.com/..."
                type="url"
                onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = '0 0 0 3px ' + C.accentLt; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label style={lbl}>Tipo de tarea *</label>
              <div role="radiogroup" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => {
                  const active = form.category === k;
                  const Ic = cfg.icon;
                  return (
                    <button key={k} type="button" role="radio" aria-checked={active} onClick={() => set('category', k)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: '12px', fontWeight: '700', letterSpacing: '0.04em',
                        border: '1.5px solid ' + (active ? cfg.color : C.border),
                        background: active ? cfg.bg : C.surface,
                        color: active ? cfg.color : C.muted,
                        boxShadow: active ? '0 0 0 3px ' + cfg.bg : 'none',
                        transition: 'all 0.15s',
                      }}>
                      <Ic size={13} />{cfg.label.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Prioridad</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value)} style={sel}>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Fecha límite</label>
                <DateTime15Picker value={form.due_date} onChange={d => { setError(''); set('due_date', d); }} defaultTime="23:45" />
              </div>
            </div>
            <div>
              <label style={lbl}>Adjuntar archivo <span style={{ textTransform: 'none', fontWeight: '400', color: C.muted, letterSpacing: 0 }}>(PDF, Excel, CSV, PNG, JPG · máx. 10 MB)</span></label>
              <div onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed ' + (file ? C.blue : C.border), borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: file ? C.accentLt : C.bg, transition: 'all 0.2s' }}
                onMouseEnter={e => { if (!file) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentLt; } }}
                onMouseLeave={e => { if (!file) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; } }}>
                <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg" onChange={handleFileChange} style={{ display: 'none' }} />
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    {isImage(file) ? (
                      <img src={URL.createObjectURL(file)} alt="preview" style={{ width: 40, height: 40, borderRadius: '8px', objectFit: 'cover', border: '1px solid ' + C.border }} />
                    ) : (
                      <FileText size={20} color={C.blue} />
                    )}
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: C.navy }}>{file.name}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{ background: C.dangerLt, border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: C.danger, display: 'flex', marginLeft: 8 }}><X size={12} /></button>
                  </div>
                ) : (
                  <div>
                    <Upload size={20} color={C.mutedLt} style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '13px', color: C.muted, fontWeight: '500' }}>Haz clic para subir un archivo</div>
                    <div style={{ fontSize: '11px', color: C.mutedLt, marginTop: 2 }}>PDF, Excel, CSV, PNG, JPG admitidos</div>
                  </div>
                )}
              </div>
            </div>
            {error && <div style={{ padding: '10px 14px', background: C.dangerLt, border: '1.5px solid #FECACA', borderRadius: '10px', color: C.danger, fontSize: '12px', fontWeight: '600' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4, paddingTop: 16, borderTop: '1px solid ' + C.border }}>
              <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '20px', border: '1.5px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" disabled={loading || descOver} style={{ padding: '10px 24px', borderRadius: '20px', border: 'none', background: 'linear-gradient(135deg, ' + C.navy + ' 0%, ' + C.blue + ' 100%)', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: (loading || descOver) ? 'not-allowed' : 'pointer', opacity: (loading || descOver) ? 0.75 : 1, display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 14px rgba(37,99,235,0.30)' }}>
                {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                {loading ? 'Creando...' : 'Crear Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, iconColor, iconBg, accent, sublabel }) {
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
        <div style={{
          fontSize: '10px', fontWeight: '700', color: accent,
          background: `${accent}14`,
          padding: '3px 9px', borderRadius: '20px',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          border: `1px solid ${accent}30`,
        }}>
          {sublabel || 'Total'}
        </div>
      </div>

      {/* Number */}
      <div>
        <div style={{
          fontSize: '32px', fontWeight: '700', color: C.navy,
          letterSpacing: '-0.03em', lineHeight: 1,
        }}>{value}</div>
        <div style={{ fontSize: '11px', color: C.muted, fontWeight: '500', marginTop: 4 }}>{label}</div>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ height: 5, background: `${accent}18`, borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: value > 0 ? `${Math.min(100, (value / 15) * 100)}%` : '4px',
            background: `linear-gradient(90deg, ${accent}, ${accent}aa)`,
            borderRadius: '10px',
            transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            minWidth: value > 0 ? undefined : '4px',
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [mainView,      setMainView]      = useState('tickets');
  const [session,       setSession]       = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [tasks,         setTasks]         = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNewTask,   setShowNewTask]   = useState(false);
  const [newTaskDate,   setNewTaskDate]   = useState(null);
  const [activeTab,     setActiveTab]     = useState('mine');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const google = useGoogleCalendar();
  const [authLoading,   setAuthLoading]   = useState(true);
  // Se guarda el id para que el detalle siempre muestre la versión actual de la tarea
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const selectedTask    = tasks.find(t => t.id === selectedTaskId) || null;
  const setSelectedTask = (task) => setSelectedTaskId(task ? task.id : null);

  // Auth form
  const [authMode,    setAuthMode]    = useState('login');
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [cargo,       setCargo]       = useState('');
  const [loginEmail,  setLoginEmail]  = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [authError,   setAuthError]   = useState(null);
  const [successMsg,  setSuccessMsg]  = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => { setSession(s); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setAuthLoading(false); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setTasks([]); setProfile(null); return; }
    const uid = session.user.id;
    loadProfile(); loadTasks();
    // Realtime solo de mis tareas. Supabase no permite filtrar eventos DELETE,
    // así que ese evento va sin filtro (solo quita ids que ya están en el estado).
    const mine = 'created_by=eq.' + uid;
    const taskSub = supabase.channel('tasks_' + uid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks', filter: mine },
        payload => setTasks(prev => [payload.new, ...prev.filter(t => t.id !== payload.new.id)]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks', filter: mine },
        payload => setTasks(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' },
        payload => setTasks(prev => prev.filter(t => t.id !== payload.old.id)))
      .subscribe();
    return () => { supabase.removeChannel(taskSub); };
  }, [session?.user.id]);

  const loadProfile       = async () => { const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single(); if (data) setProfile(data); };
  const loadTasks         = async () => { const { data } = await supabase.from('tasks').select('*').eq('created_by', session.user.id).order('created_at', { ascending: false }); if (data) setTasks(data); };

  const handleStatusChange = async (taskId, newStatus) => {
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
    const upd = newStatus === 'completed'
      ? { status: newStatus, completed_at: completedAt }
      : { status: newStatus };
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...upd } : t));
    const { data, error } = await supabase.from('tasks').update(upd).eq('id', taskId).select().single();
    if (error) { console.error('Error updating task status:', error); loadTasks(); return; }
    if (data) setTasks(prev => prev.map(t => t.id === taskId ? data : t));
  };

  // ── Programar tareas en el calendario ─────────────────────────────────────
  const replaceTask = (task) => setTasks(prev => prev.map(t => (t.id === task.id ? task : t)));

  // Crea o actualiza el evento "📌 tarea" en Google y devuelve su id
  const syncTaskEvent = async (task) => {
    const body = taskEventBody(task);
    if (task.google_event_id) {
      try { return (await google.patchEvent(task.google_event_id, body)).id; }
      catch (err) { if (err.status !== 404 && err.status !== 410) throw err; } // lo borraron en Google: crear otro
    }
    return (await google.insertEvent(body)).id;
  };

  // Guarda el bloque en Supabase y, si Google está conectado, lo sincroniza.
  // Lanza error si no se pudo guardar; devuelve { warning } si solo falló Google.
  const scheduleTask = async (task, start, end) => {
    const upd = { scheduled_start: start.toISOString(), scheduled_end: end.toISOString() };
    replaceTask({ ...task, ...upd });
    const { data, error } = await supabase.from('tasks').update(upd).eq('id', task.id).select().single();
    if (error) { replaceTask(task); throw new Error('No se pudo guardar el horario: ' + error.message); }
    replaceTask(data);
    if (google.status !== 'connected') return {};
    try {
      const eventId = await syncTaskEvent(data);
      if (eventId !== data.google_event_id) {
        const { data: linked } = await supabase.from('tasks').update({ google_event_id: eventId }).eq('id', task.id).select().single();
        if (linked) replaceTask(linked);
      }
      return {};
    } catch (err) {
      return { warning: 'Horario guardado, pero no se pudo sincronizar con Google Calendar: ' + (err.isAuthError ? 'la sesión de Google expiró.' : err.message) };
    }
  };

  // Devuelve la tarea a la bandeja "Por programar" y borra su evento en Google
  const unscheduleTask = async (task) => {
    const upd = { scheduled_start: null, scheduled_end: null };
    if (task.google_event_id && google.status === 'connected') {
      try { await google.deleteEvent(task.google_event_id); upd.google_event_id = null; }
      catch (err) { console.warn('No se pudo eliminar el evento de Google:', err.message); }
    }
    replaceTask({ ...task, ...upd });
    const { data, error } = await supabase.from('tasks').update(upd).eq('id', task.id).select().single();
    if (error) { replaceTask(task); console.error('Error quitando el horario:', error); return; }
    replaceTask(data);
  };

  const [deleteConfirm, setDeleteConfirm] = useState(null); // taskId a eliminar

  const handleDelete = (taskId) => {
    setDeleteConfirm(taskId);
  };

  const confirmDelete = async () => {
    const taskId = deleteConfirm;
    const task = tasks.find(t => t.id === taskId);
    setDeleteConfirm(null);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) { console.error('Error deleting task:', error); loadTasks(); return; }
    if (task?.google_event_id && google.status === 'connected') {
      google.deleteEvent(task.google_event_id).catch(err => console.warn('No se pudo eliminar el evento de Google:', err.message));
    }
  };

  const handleProfileUpdated = (updatedProfile) => {
    setProfile(updatedProfile);
  };


  // ── AUTH ──────────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!loginEmail.trim()) e.loginEmail = 'El correo es obligatorio';
    if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (authMode === 'signup') {
      if (!firstName.trim())  e.firstName = 'Ingresa tu nombre';
      if (!lastName.trim())   e.lastName  = 'Ingresa tu apellido';
    }
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setFormLoading(true); setAuthError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (err) setAuthError('Correo o contraseña incorrectos.');
    setFormLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setFormLoading(true); setAuthError(null); setSuccessMsg(null);
    const email = loginEmail.trim().toLowerCase();
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), cargo: cargo.trim(), full_name: `${firstName.trim()} ${lastName.trim()}` } },
    });
    if (err) { setAuthError(err.message); setFormLoading(false); return; }
    setAuthMode('login');
    setLoginEmail(email);
    setPassword('');
    setFirstName(''); setLastName(''); setCargo('');
    setFieldErrors({});
    setSuccessMsg(`¡Cuenta creada con éxito! Ya puedes ingresar con ${email}`);
    setFormLoading(false);
  };

  const resetForm = () => {
    setFirstName(''); setLastName(''); setCargo('');
    setLoginEmail(''); setPassword('');
    setFieldErrors({}); setAuthError(null); setSuccessMsg(null);
  };

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const myPending    = tasks.filter(t => t.status !== 'completed').length;
  const myCompleted  = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(t => isOverdue(t.due_date, t.status)).length;

  // ── FILTERED TASKS ────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter(t => {
    if (categoryFilter !== 'all' && (t.category || 'otro') !== categoryFilter) return false;
    if (activeTab === 'mine')      return t.status !== 'completed';
    if (activeTab === 'completed') return t.status === 'completed';
    return true;
  });
  const displayTasks = filteredTasks.slice(0, 15);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: C.darkBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '14px', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={24} color="#fff" />
          </div>
          <Loader2 size={20} color={C.accent} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </div>
    );
  }

  // =========================================================================
  // DASHBOARD
  // =========================================================================
  if (session) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
          @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
          *{box-sizing:border-box} body{margin:0}
          ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
          input::placeholder{color:${C.mutedLt}} textarea::placeholder{color:${C.mutedLt}}
          [contenteditable]:empty:before{content:attr(data-placeholder);color:${C.mutedLt};pointer-events:none}
          select option{background:${C.surface};color:${C.text}}
        `}</style>

       {/* NAVBAR */}
        <header style={{
          width: '100%', height: '64px',
          background: C.surface,
          borderBottom: `1.5px solid ${C.border}`,
          padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 1px 0 rgba(203,213,225,1), 0 2px 8px rgba(15,32,64,0.04)',
        }}>
          {/* LEFT: Logo + Main Nav Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 28 }}>
              {/* LOGO: cuando tengas el logo nuevo, guárdalo en src/ (p. ej. src/logo.png),
                  impórtalo arriba (import logo from './logo.png') y reemplaza el ícono por:
                  <img src={logo} alt="MyWorkspace" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> */}
              <div style={{ width: 34, height: 34, borderRadius: '10px', overflow: 'hidden', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LayoutDashboard size={18} color="#fff" />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontWeight: '900', fontSize: '15px', color: C.navy, letterSpacing: '-0.02em' }}>My</span>
                <span style={{ fontWeight: '400', fontSize: '15px', color: C.accent }}>Workspace</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 28, background: C.border, marginRight: 20 }} />
            

            {/* Main nav tabs */}
            {[
              { id: 'tickets',     label: 'Tickets'       },
              { id: 'calendar',    label: 'Calendario'    },
            ].map(({ id, label }) => {
              const isActive = mainView === id;
              return (
                <button key={id} onClick={() => setMainView(id)}
                  style={{
                    padding: '6px 16px',
                    border: 'none',
                    background: 'transparent',
                    color: isActive ? C.navy : C.muted,
                    fontWeight: isActive ? '700' : '500',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    position: 'relative',
                    height: '64px',
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                    borderBottom: isActive ? `2.5px solid ${C.blue}` : '2.5px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.navy; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.muted; }}>
                  {label}
                </button>
              );
            })}
          <div style={{ width: 1, height: 28, background: C.border, marginLeft: 8 }} />
          </div>

          {/* RIGHT: Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Logout */}
            <button onClick={() => supabase.auth.signOut()} title="Cerrar sesión"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: 'transparent', border: `1.5px solid ${C.border}`, color: C.mutedLt, borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = C.dangerLt; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = C.danger; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.mutedLt; }}>
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Profile modal — centered overlay, triggered from sidebar pencil */}
          {showProfileMenu && profile && (
            <>
              <div
                onClick={() => setShowProfileMenu(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(4px)', zIndex: 299 }}
              />
              <div style={{
                position: 'fixed',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 300,
              }}>
                <ProfileMenu
                  profile={profile}
                  currentUserId={session.user.id}
                  onClose={() => setShowProfileMenu(false)}
                  onProfileUpdated={handleProfileUpdated}
                />
              </div>
            </>
          )}

        {/* MAIN */}
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>

          {/* Sidebar — only when mainView === 'tickets' */}
          {mainView === 'tickets' && (
            <>
              {/* Tab navigation + Profile sidebar — FIXED */}
              <div style={{
                position: 'fixed', top: '64px', left: 0, bottom: 0, width: '220px',
                background: C.navy,
                borderRight: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 90,
              }}>

                {/* Profile */}
                <div style={{ padding: '24px 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                  <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', border: '3px solid rgba(255,255,255,0.2)', display: 'inline-block', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile?.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: C.accentLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '800', color: C.navy }}>
                          {initials(profile?.full_name || '')}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setShowProfileMenu(true)}
                      style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: C.gold, border: '2px solid rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                      <Edit2 size={10} color="#fff" />
                    </button>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>{profile?.full_name}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', padding: '0 8px' }}>{profile?.cargo}</div>
                </div>

                {/* Sub-tabs */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px 16px' }}>
                  <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '6px 8px 10px' }}></div>
                  {[
                    { id: 'mine',      label: 'Pendientes',     icon: Clock           },
                    { id: 'all',       label: 'Todas',          icon: LayoutDashboard },
                    { id: 'completed', label: 'Completadas',    icon: CheckCircle2    },
                  ].map(({ id, label, icon: Ic }) => {
                    const isActive = activeTab === id;
                    return (
                      <button key={id} onClick={() => setActiveTab(id)}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: '4px', border: 'none',
                          background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.50)',
                          fontWeight: isActive ? '600' : '400', fontSize: '12px', cursor: 'pointer',
                          transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 10,
                          textAlign: 'left', marginBottom: 1,
                          boxShadow: 'none',
                          borderLeft: isActive ? `2px solid rgba(255,255,255,0.6)` : '2px solid transparent',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; } }}
                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.50)'; } }}>
                        <div style={{ width: 28, height: 28, borderRadius: '8px', background: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Ic size={13} color={isActive ? '#fff' : 'rgba(255,255,255,0.5)'} />
                        </div>
                        <span style={{ flex: 1 }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Spacer */}
              <div style={{ width: '220px', flexShrink: 0 }} />
            </>
          )}

          {/* CONTENT AREA */}
          <main style={{ flex: 1, padding: '32px 28px', minWidth: 0, animation: 'fadeUp 0.4s ease-out' }}>

            {/* Stat cards + New task button — only in tickets view */}
            {mainView === 'tickets' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 14, flex: 1, minWidth: 0 }}>
                  <StatCard icon={Clock} label="Mis Pendientes" value={myPending} iconColor={C.accent} iconBg={C.accentLt} accent={C.accent} sublabel="tareas sin completar" />
                  <StatCard icon={CheckCircle2} label="Completadas" value={myCompleted} iconColor={C.success} iconBg={C.successLt} accent={C.success} sublabel="tareas finalizadas" />
                  <StatCard icon={AlertCircle} label="Vencidas" value={overdueCount} iconColor={C.danger} iconBg={C.dangerLt} accent={C.danger} sublabel="requieren atención" />
                </div>
                <button onClick={() => { setNewTaskDate(null); setShowNewTask(true); }}
                  style={{ padding: '9px 18px', background: C.navy, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 4px rgba(15,32,64,0.20)', transition: 'all 0.15s', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  <Plus size={16} /> Nueva Tarea
                </button>
              </div>
            )}

            {/* Filtro por tipo */}
            {mainView === 'tickets' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: C.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: 4 }}>Tipo</span>
                {[['all', { label: 'Todos', icon: LayoutDashboard, color: C.navy, bg: C.accentLt }], ...Object.entries(CATEGORY_CONFIG)].map(([k, cfg]) => {
                  const active = categoryFilter === k;
                  const Ic = cfg.icon;
                  return (
                    <button key={k} onClick={() => setCategoryFilter(k)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 12px', borderRadius: '20px', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: '12px', fontWeight: active ? '700' : '500',
                        border: '1.5px solid ' + (active ? cfg.color : C.border),
                        background: active ? cfg.bg : C.surface,
                        color: active ? cfg.color : C.muted,
                        transition: 'all 0.15s',
                      }}>
                      <Ic size={12} />{cfg.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── TICKETS VIEW ── */}
            {mainView === 'tickets' && activeTab === 'mine' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                {STATUS_COLS_MINE.map(col => {
                  const colTasks = displayTasks.filter(t => t.status === col.status);
                  return (
                    <div key={col.status}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 14px', background: C.surface, borderRadius: '12px', border: `1.5px solid ${C.border}` }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: C.navy, flex: 1 }}>{col.label}</h3>
                        <span style={{ background: col.tag, color: col.tagText, borderRadius: '20px', padding: '2px 9px', fontSize: '11px', fontWeight: '700' }}>{colTasks.length}</span>
                      </div>
                      {colTasks.length === 0
                        ? <div style={{ border: `2px dashed ${C.border}`, borderRadius: '14px', padding: '36px 24px', textAlign: 'center', color: C.mutedLt, fontSize: '12px' }}>Sin tareas en esta columna</div>
                        : colTasks.map(task => (
                          <TicketCard key={task.id} task={task}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete} onViewDetail={setSelectedTask} />
                        ))
                      }
                    </div>
                  );
                })}
              </div>
            )}

            {mainView === 'tickets' && activeTab === 'completed' && (
              <div style={{ maxWidth: '720px' }}>
                {displayTasks.length === 0
                  ? <div style={{ border: `1px dashed ${C.border}`, borderRadius: '6px', padding: '48px', textAlign: 'center', color: C.mutedLt }}>
                      <CheckCircle2 size={32} color={C.border} style={{ margin: '0 auto 12px', display: 'block' }} />
                      <div style={{ fontSize: '14px', fontWeight: '500', color: C.muted, marginBottom: 4 }}>Sin tareas completadas aún</div>
                    </div>
                  : displayTasks.map(task => (
                    <TicketCard key={task.id} task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete} onViewDetail={setSelectedTask} />
                  ))
                }
              </div>
            )}

            {mainView === 'tickets' && activeTab === 'all' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
                {STATUS_COLS.map(col => {
                  const colTasks = displayTasks.filter(t => t.status === col.status);
                  return (
                    <div key={col.status}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '10px 14px', background: C.surface, borderRadius: '12px', border: `1.5px solid ${C.border}` }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: C.navy, flex: 1 }}>{col.label}</h3>
                        <span style={{ background: col.tag, color: col.tagText, borderRadius: '20px', padding: '2px 9px', fontSize: '11px', fontWeight: '700' }}>{colTasks.length}</span>
                      </div>
                      {colTasks.length === 0
                        ? <div style={{ border: `2px dashed ${C.border}`, borderRadius: '14px', padding: '36px 24px', textAlign: 'center', color: C.mutedLt, fontSize: '12px' }}>Sin tareas en esta columna</div>
                        : colTasks.map(task => (
                          <TicketCard key={task.id} task={task}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete} onViewDetail={setSelectedTask} />
                        ))
                      }
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── CALENDARIO VIEW ── */}
            {mainView === 'calendar' && (
              <CalendarView tasks={tasks} google={google} onTaskClick={setSelectedTask} onScheduleTask={scheduleTask}
                onDayClick={(day) => {
                  // Fecha límite al final del día elegido
                  const due = new Date(day); due.setHours(23, 45, 0, 0);
                  setNewTaskDate(due);
                  setShowNewTask(true);
                }} />
            )}

          </main>
        </div>

        {showNewTask && (
          <NewTaskModal currentUserId={session.user.id} initialDueDate={newTaskDate}
            onClose={() => setShowNewTask(false)}
            onCreated={t => setTasks(prev => [t, ...prev])} />
        )}
        {selectedTask && (
          <TaskDetailModal task={selectedTask}
            onClose={() => setSelectedTask(null)} onStatusChange={handleStatusChange} onDelete={handleDelete}
            onUnschedule={unscheduleTask} />
        )}
        {/* Modal confirmar eliminar */}
        {deleteConfirm && (
          <>
            <div onClick={() => setDeleteConfirm(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(6px)', zIndex: 1999 }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2000, background: C.surface, borderRadius: '20px', padding: '28px', width: '320px', border: '1.5px solid ' + C.border, boxShadow: '0 24px 64px rgba(27,58,107,0.22)', animation: 'slideDown 0.15s ease-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: '12px', background: C.dangerLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trash2 size={20} color={C.danger} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: C.navy }}>Eliminar ticket</div>
                  <div style={{ fontSize: '11px', color: C.muted }}>Esta acción no se puede deshacer</div>
                </div>
              </div>
              <p style={{ margin: '0 0 20px', fontSize: '13px', color: C.text, lineHeight: '1.6', background: C.bg, padding: '12px 14px', borderRadius: '10px', border: '1px solid ' + C.border }}>
                ¿Estás seguro de que quieres eliminar este ticket permanentemente?
                {tasks.find(t => t.id === deleteConfirm)?.google_event_id && google.status !== 'connected' && (
                  <span style={{ display: 'block', marginTop: 8, fontSize: '12px', color: C.warn, fontWeight: '600' }}>
                    Este ticket tiene un evento en Google Calendar. Conecta Google Calendar antes de eliminar para borrarlo también.
                  </span>
                )}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '12px', border: '1.5px solid ' + C.border, background: 'transparent', color: C.muted, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={confirmDelete}
                  style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #DC2626, #EF4444)', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(220,38,38,0.30)' }}>
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </div>
          </>
        )}
          </div>
    );
  }
  

  // =========================================================================
  // AUTH PAGE
  // =========================================================================
  const darkInp = {
    width: '100%', height: '46px', padding: '0 16px',
    borderRadius: '10px', border: `1.5px solid rgba(0,0,0,0.12)`,
    background: '#fff', color: C.navy,
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Sora', sans-serif", transition: 'border-color 0.15s, box-shadow 0.15s',
  };
  const darkLbl = { display: 'block', fontSize: '11px', fontWeight: '700', color: C.navy, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' };
  const errBorder = { borderColor: '#EF4444' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden', background: '#000', fontFamily: "'Sora', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box} body{margin:0}
        .dark-input::placeholder{color:#94A3B8}
        .dark-input:focus{border-color:${C.accent}!important;box-shadow:0 0 0 3px rgba(91,155,213,0.2)!important;background:#fff!important}
        .auth-tab{transition:all 0.2s}
      `}</style>

      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${BG_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.35) saturate(0.6)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.75) 100%)' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '40px 64px', maxWidth: '1200px', margin: '0 auto', gap: '64px' }}>
        <div style={{ flex: 1, color: '#fff', maxWidth: '480px', animation: 'fadeUp 0.5s ease-out' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(91,155,213,0.15)', border: '1px solid rgba(91,155,213,0.3)', borderRadius: '100px', padding: '5px 14px', marginBottom: 24 }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: C.accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Bienvenido a</span>
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: '64px', fontWeight: '900', lineHeight: '1', letterSpacing: '-0.04em', color: '#fff' }}>My</h1>
          <h1 style={{ margin: '0 0 24px', fontSize: '64px', fontWeight: '900', lineHeight: '1', letterSpacing: '-0.04em', color: C.accent }}>Workspace</h1>
          <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.55)', fontWeight: '300', lineHeight: '1.80', maxWidth: '380px' }}>
            Organiza tus tareas de trabajo, universidad y vida personal en un solo lugar, con tablero, calendario y sincronización con Google Calendar.
          </p>
        </div>

        <div style={{ width: '100%', maxWidth: '420px', background: '#ffffff', backdropFilter: 'blur(24px)', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden', animation: 'fadeUp 0.5s ease-out 0.1s both' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
            {[['login', 'Ingresar'], ['signup', 'Crear cuenta']].map(([mode, label]) => (
              <button key={mode} className="auth-tab" onClick={() => { setAuthMode(mode); resetForm(); }}
                style={{ flex: 1, padding: '18px 0', border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: authMode === mode ? 'rgba(37,99,235,0.05)' : 'transparent', color: authMode === mode ? C.blue : C.muted, fontSize: '13px', fontWeight: '700', borderBottom: authMode === mode ? `2px solid ${C.blue}` : '2px solid transparent', transition: 'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '28px' }}>
            {authError && <div style={{ padding: '10px 14px', background: C.dangerLt, border: `1px solid #FECACA`, borderRadius: '10px', color: C.danger, fontSize: '12px', marginBottom: 16, fontWeight: '600' }}>{authError}</div>}
            {successMsg && (
              <div style={{ padding: '12px 16px', background: C.successLt, border: `1.5px solid #BBF7D0`, borderRadius: '12px', color: C.success, fontSize: '12px', marginBottom: 16, fontWeight: '600', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={authMode === 'signup' ? handleSignUp : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={darkLbl}>Correo electrónico{authMode === 'signup' ? ' *' : ''}</label>
                <input className="dark-input" style={{ ...darkInp, ...(fieldErrors.loginEmail ? errBorder : {}) }}
                  type="email" placeholder="tucorreo@gmail.com" autoComplete="email"
                  value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setFieldErrors(x => ({ ...x, loginEmail: undefined })); }} required />
                {fieldErrors.loginEmail && <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.danger }}>{fieldErrors.loginEmail}</p>}
              </div>

              {authMode === 'signup' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={darkLbl}>Nombres *</label>
                      <input className="dark-input" style={{ ...darkInp, ...(fieldErrors.firstName ? errBorder : {}) }}
                        placeholder="Juan" value={firstName}
                        onChange={e => { setFirstName(e.target.value); setFieldErrors(x => ({ ...x, firstName: undefined })); }} required />
                      {fieldErrors.firstName && <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.danger }}>{fieldErrors.firstName}</p>}
                    </div>
                    <div>
                      <label style={darkLbl}>Apellidos *</label>
                      <input className="dark-input" style={{ ...darkInp, ...(fieldErrors.lastName ? errBorder : {}) }}
                        placeholder="Pérez" value={lastName}
                        onChange={e => { setLastName(e.target.value); setFieldErrors(x => ({ ...x, lastName: undefined })); }} required />
                      {fieldErrors.lastName && <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.danger }}>{fieldErrors.lastName}</p>}
                    </div>
                  </div>
                  <div>
                    <label style={darkLbl}>Cargo <span style={{ textTransform: 'none', fontWeight: '400', color: C.muted, letterSpacing: 0 }}>(opcional)</span></label>
                    <input className="dark-input" style={darkInp}
                      placeholder="Ej: Estudiante, Desarrollador..." value={cargo}
                      onChange={e => setCargo(e.target.value)} />
                  </div>
                </>
              )}

              <div>
                <label style={darkLbl}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input className="dark-input" style={{ ...darkInp, paddingRight: 44, ...(fieldErrors.password ? errBorder : {}) }}
                    type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password}
                    onChange={e => { setPassword(e.target.value); setFieldErrors(x => ({ ...x, password: undefined })); }} required />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.danger }}>{fieldErrors.password}</p>}
              </div>

              <button type="submit" disabled={formLoading}
                style={{ width: '100%', height: '48px', background: `linear-gradient(135deg, ${C.blue} 0%, ${C.navy} 100%)`, color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: formLoading ? 'not-allowed' : 'pointer', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: formLoading ? 0.75 : 1, transition: 'all 0.15s', boxShadow: '0 4px 20px rgba(37,99,235,0.35)', fontFamily: 'inherit' }}>
                {formLoading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {!formLoading && (authMode === 'signup' ? 'Crear cuenta' : 'Ingresar al workspace')}
                {formLoading && (authMode === 'signup' ? 'Creando...' : 'Ingresando...')}
              </button>
            </form> 
          </div>
        </div>
      </div>
    </div>
  );
}