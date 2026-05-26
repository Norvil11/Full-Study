import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import {
  Eye, EyeOff, LogOut, Plus, Calendar,
  CheckCircle2, Clock, AlertCircle, Trash2,
  Bell, X, AlertTriangle, Loader2, Send,
  Briefcase, LayoutDashboard,
  CheckSquare, Users, Zap, FileText,
  Upload, Paperclip, ExternalLink, ChevronRight,
  Camera, TrendingUp, BarChart2, Target, Trophy,
  Medal, Crown, Star, ChevronUp, ChevronDown,
  Settings, User, Edit2, Save, MessageCircle,
  Hash, Smile, MoreVertical, Trash, ArrowLeft,
} from 'lucide-react';
import logoHS from './LOGO_HS_SF.png';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LOGO_URL = logoHS;
const BG_IMAGE = "https://img.magnific.com/foto-gratis/colegas-sonrientes-tiro-medio-trabajo_23-2149308453.jpg?semt=ais_hybrid&w=740&q=80";
const DOMAIN = '@hanter.com.pe';

const CARGO_OPTIONS = [
  "Especialista en Marketing Digital & Growth",
  "Analista de inteligencia de negocios",
  "Data Engineering Manager",
  "Analista Funcional",
  "Automation Engineering Manager",
  "Desarrollador Full Stack",
];

const C = {
  navy:      '#1B3A6B',
  blue:      '#2563EB',
  accent:    '#5B9BD5',
  accentLt:  '#DBEAFE',
  bg:        '#F0F4FA',
  surface:   '#FFFFFF',
  border:    '#E2E8F0',
  muted:     '#64748B',
  mutedLt:   '#94A3B8',
  text:      '#1E293B',
  danger:    '#DC2626',
  dangerLt:  '#FEE2E2',
  success:   '#16A34A',
  successLt: '#DCFCE7',
  warn:      '#D97706',
  warnLt:    '#FEF3C7',
  violet:    '#7C3AED',
  violetLt:  '#EDE9FE',
  gold:      '#F59E0B',
  goldLt:    '#FEF3C7',
  silver:    '#94A3B8',
  bronze:    '#D97706',
  darkBg:    '#000000',
  darkCard:  '#0D1117',
  darkBorder:'#1F2937',
  darkMuted: '#6B7280',
};

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
function formatTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}
function isOverdue(due, status) {
  if (!due || status === 'completed') return false;
  return new Date(due) < new Date();
}
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}
function getDaysUntil(due) {
  if (!due) return null;
  const diff = new Date(due) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Avatar({ name = '', size = 32, photoUrl = null }) {
  const colors = [
    ['#DBEAFE','#1B3A6B'], ['#EDE9FE','#5B21B6'],
    ['#DCFCE7','#15803D'], ['#FEF3C7','#B45309'],
    ['#FCE7F3','#9D174D'], ['#F0FDF4','#166534'],
  ];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const [bg, fg] = colors[h % colors.length];
  if (photoUrl) {
    return <img src={photoUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${C.border}` }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: '700', flexShrink: 0, fontFamily: "'Sora', sans-serif" }}>
      {initials(name) || '?'}
    </div>
  );
}

function Chip({ children, color, bg, border }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.03em', color, background: bg, border: `1px solid ${border}` }}>
      {children}
    </span>
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
          <div style={{ marginTop: 6, display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '2px 10px', fontSize: '10px', color: 'rgba(255,255,255,0.85)', fontWeight: '600' }}>
            {profile?.cargo}
          </div>
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
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: C.navy, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cargo</label>
                <input list="cargo-opts-profile" style={inp} value={editForm.cargo}
                  onChange={e => setEditForm(f => ({ ...f, cargo: e.target.value }))}
                  onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.background = '#fff'; }}
                  onBlur={e =>  { e.target.style.borderColor = C.border; e.target.style.background = C.bg; }} />
                <datalist id="cargo-opts-profile">{CARGO_OPTIONS.map(c => <option key={c} value={c} />)}</datalist>
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

// ─── TASK DETAIL MODAL ────────────────────────────────────────────────────────
function TaskDetailModal({ task, profiles, currentUserId, onClose, onStatusChange, onDelete }) {
  if (!task) return null;
  const assignee  = profiles.find(p => p.id === task.assigned_to);
  const creator   = profiles.find(p => p.id === task.created_by);
  const overdue   = isOverdue(task.due_date, task.status);
  const isCreator  = task.created_by  === currentUserId;
  const isAssigned = task.assigned_to === currentUserId;
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
            {task.description
              ? <p style={{ margin: 0, fontSize: '14px', color: C.text, lineHeight: '1.75', background: C.bg, padding: '16px', borderRadius: '12px', border: `1px solid ${C.border}` }}>{task.description}</p>
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
              { label: 'Asignado a', content: assignee ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <Avatar name={assignee.full_name} size={28} photoUrl={assignee.avatar_url} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: C.navy }}>{assignee.full_name}</div>
                    <div style={{ fontSize: '11px', color: C.muted }}>{assignee.cargo}</div>
                  </div>
                </div>
              ) : <span style={{ fontSize: '13px', color: C.mutedLt, marginTop: 6, display: 'block' }}>Sin asignar</span> },
              { label: 'Creado por', content: creator ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <Avatar name={creator.full_name} size={28} photoUrl={creator.avatar_url} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: C.navy }}>{creator.full_name}</div>
                    <div style={{ fontSize: '11px', color: C.muted }}>{creator.cargo}</div>
                  </div>
                </div>
              ) : null },
              { label: 'Fecha límite', content: (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: overdue ? C.danger : C.text }}>
                  {overdue ? <AlertTriangle size={14} /> : <Calendar size={14} color={C.accent} />}
                  <span style={{ fontSize: '13px', fontWeight: overdue ? '700' : '500' }}>{formatDate(task.due_date)}</span>
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

          {task.status === 'completed' && task.completed_at && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: C.successLt, borderRadius: '12px', marginBottom: 24, border: `1px solid #BBF7D0` }}>
              <CheckCircle2 size={16} color={C.success} />
              <span style={{ fontSize: '13px', color: C.success, fontWeight: '600' }}>Completado el {formatDate(task.completed_at)}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {isAssigned && task.status !== 'completed' && (
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
            {isCreator && (
              <button onClick={() => { onDelete(task.id); onClose(); }}
                style={{ padding: '8px 16px', borderRadius: '20px', border: `1.5px solid ${C.dangerLt}`, background: C.dangerLt, color: C.danger, fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Trash2 size={13} /> Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TICKET CARD ─────────────────────────────────────────────────────────────
function TicketCard({ task, currentUserId, profiles, onStatusChange, onDelete, onViewDetail }) {
  const assignee  = profiles.find(p => p.id === task.assigned_to);
  const overdue   = isOverdue(task.due_date, task.status);
  const isCreator  = task.created_by  === currentUserId;
  const isAssigned = task.assigned_to === currentUserId;
  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const daysLeft = getDaysUntil(task.due_date);

  return (
    <div style={{
      background: C.surface, border: `1.5px solid ${overdue ? '#FECACA' : C.border}`,
      borderLeft: `4px solid ${pCfg.color}`, borderRadius: '14px', padding: '16px', marginBottom: '10px',
      boxShadow: overdue ? '0 2px 12px rgba(220,38,38,0.08)' : '0 1px 4px rgba(27,58,107,0.06)',
      transition: 'box-shadow 0.2s, transform 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(27,58,107,0.11)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(27,58,107,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', color: C.mutedLt, fontFamily: 'monospace', fontWeight: '600' }}>#{task.id.substring(0, 8).toUpperCase()}</span>
            <Chip color={pCfg.color} bg={pCfg.bg} border={pCfg.border}>{pCfg.label}</Chip>
            {overdue && <Chip color={C.danger} bg={C.dangerLt} border="#FECACA">Vencida</Chip>}
            {task.file_url && <Chip color={C.accent} bg={C.accentLt} border="#BFDBFE"><Paperclip size={9} style={{ marginRight: 3 }} />Adjunto</Chip>}
          </div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: C.navy, lineHeight: '1.35' }}>{task.title}</h3>
        </div>
        <button onClick={() => onViewDetail(task)}
          style={{ background: C.bg, border: `1px solid ${C.border}`, cursor: 'pointer', color: C.muted, padding: '5px 10px', borderRadius: '8px', flexShrink: 0, marginLeft: 8, fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={e => { e.currentTarget.style.background = C.accentLt; e.currentTarget.style.color = C.navy; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.muted; }}
        >Ver <ChevronRight size={11} /></button>
      </div>

      {task.description && (
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: C.muted, lineHeight: '1.55', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {task.description}
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: C.muted, marginBottom: 12 }}>
        {assignee && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Avatar name={assignee.full_name} size={20} photoUrl={assignee.avatar_url} />
            <span style={{ color: C.navy, fontWeight: '600' }}>{assignee.full_name}</span>
          </div>
        )}
        {task.due_date && task.status !== 'completed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: overdue ? C.danger : daysLeft !== null && daysLeft <= 2 ? C.warn : C.muted, fontWeight: overdue ? '700' : daysLeft !== null && daysLeft <= 2 ? '600' : '400' }}>
            {overdue ? <AlertTriangle size={11} /> : <Calendar size={11} />}
            {overdue
              ? `Vencido: ${formatDate(task.due_date)}`
              : daysLeft === 0 ? '⚡ Vence hoy'
              : daysLeft === 1 ? '⚠️ Vence mañana'
              : daysLeft !== null && daysLeft <= 3 ? `⚠️ ${daysLeft} días`
              : `Vence: ${formatDate(task.due_date)}`
            }
          </div>
        )}
      </div>

      {isAssigned && task.status !== 'completed' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {task.status === 'pending' && (
            <button onClick={() => onStatusChange(task.id, 'in_progress')}
              style={{ padding: '5px 12px', borderRadius: '20px', border: `1.5px solid ${C.accentLt}`, background: C.accentLt, color: C.navy, fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
              Iniciar tarea
            </button>
          )}
          <button onClick={() => onStatusChange(task.id, 'completed')}
            style={{ padding: '5px 12px', borderRadius: '20px', border: `1.5px solid ${C.successLt}`, background: C.successLt, color: C.success, fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} /> Marcar realizado
          </button>
        </div>
      )}

      {isCreator && task.status !== 'completed' && !isAssigned && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onDelete(task.id)}
            style={{ padding: '5px 12px', borderRadius: '20px', border: `1.5px solid ${C.dangerLt}`, background: C.dangerLt, color: C.danger, fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Trash2 size={11} /> Eliminar
          </button>
        </div>
      )}
      {isCreator && isAssigned && task.status !== 'completed' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {task.status === 'pending' && (
            <button onClick={() => onStatusChange(task.id, 'in_progress')}
              style={{ padding: '5px 12px', borderRadius: '20px', border: `1.5px solid ${C.accentLt}`, background: C.accentLt, color: C.navy, fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
              Iniciar tarea
            </button>
          )}
          <button onClick={() => onStatusChange(task.id, 'completed')}
            style={{ padding: '5px 12px', borderRadius: '20px', border: `1.5px solid ${C.successLt}`, background: C.successLt, color: C.success, fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} /> Marcar realizado
          </button>
          <button onClick={() => onDelete(task.id)}
            style={{ padding: '5px 12px', borderRadius: '20px', border: `1.5px solid ${C.dangerLt}`, background: C.dangerLt, color: C.danger, fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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
          {isCreator && (
            <button onClick={() => onDelete(task.id)}
              style={{ padding: '4px 10px', borderRadius: '20px', border: `1.5px solid ${C.dangerLt}`, background: C.dangerLt, color: C.danger, fontSize: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Trash2 size={10} /> Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── NEW TASK MODAL ───────────────────────────────────────────────────────────
function NewTaskModal({ profiles, currentUserId, onClose, onCreated, preAssignTo = null }) {
  const [form, setForm] = useState({ title: '', description: '', assigned_to: preAssignTo || '', priority: 'medium', due_date: '' });
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef = useRef();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Allowed MIME types: PDF, Excel, CSV, PNG, JPG/JPEG
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

  const handleDueDateChange = (e) => {
    const val = e.target.value;
    if (val) {
      const selected = new Date(val);
      const now = new Date();
      now.setSeconds(0, 0);
      if (selected < now) {
        setError('Elige una fecha válida. La fecha límite no puede ser anterior a la actual.');
        set('due_date', '');
        return;
      }
    }
    setError('');
    set('due_date', val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('El título es obligatorio.');
    if (!form.assigned_to)  return setError('Debes asignar la tarea a alguien.');
    if (form.due_date) {
      const selected = new Date(form.due_date);
      const now = new Date();
      now.setSeconds(0, 0);
      if (selected < now) return setError('Elige una fecha válida. La fecha límite no puede ser anterior a la actual.');
    }
    setLoading(true); setError('');
    let fileUrl = null, fileName = null;
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `tasks/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('task-files').upload(path, file);
      if (upErr) { setLoading(false); return setError('Error subiendo archivo: ' + upErr.message); }
      const { data: urlData } = supabase.storage.from('task-files').getPublicUrl(path);
      fileUrl = urlData.publicUrl; fileName = file.name;
    }
    const { data, error: err } = await supabase.from('tasks').insert([{
      title: form.title.trim(), description: form.description.trim() || null,
      assigned_to: form.assigned_to, priority: form.priority,
      due_date: form.due_date || null, created_by: currentUserId, status: 'pending',
      file_url: fileUrl, file_name: fileName,
    }]).select().single();
    setLoading(false);
    if (err) return setError(err.message);
    onCreated(data); onClose();
  };

  const minDatetime = (() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now.toISOString().slice(0, 16);
  })();

  const sel = { width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit' };
  const inp = { width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: `1.5px solid ${C.border}`, background: C.surface, color: C.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lbl = { display: 'block', fontSize: '11px', fontWeight: '700', color: C.navy, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' };

  // Detect if attached file is an image for preview
  const isImage = (f) => f && f.type && f.type.startsWith('image/');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: C.surface, borderRadius: '24px', width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', border: `1.5px solid ${C.border}`, boxShadow: '0 32px 80px rgba(27,58,107,0.22)' }}>
        <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`, borderRadius: '22px 22px 0 0', padding: '24px 28px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = `0 0 0 3px ${C.accentLt}`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
            </div>
            <div>
              <label style={lbl}>Descripción</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Detalla los criterios de aceptación, contexto y resultados esperados..." rows={4}
                style={{ ...inp, height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: '1.6' }}
                onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = `0 0 0 3px ${C.accentLt}`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }} />
            </div>
            <div>
              <label style={lbl}>Asignar a *</label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} required style={sel}>
                <option value="">— Selecciona un miembro —</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name} · {p.cargo}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Prioridad</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value)} style={sel}>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Fecha límite</label>
                <input
                  type="datetime-local"
                  value={form.due_date}
                  min={minDatetime}
                  onChange={handleDueDateChange}
                  style={inp}
                  onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = `0 0 0 3px ${C.accentLt}`; }}
                  onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
            <div>
              <label style={lbl}>Adjuntar archivo <span style={{ textTransform: 'none', fontWeight: '400', color: C.muted, letterSpacing: 0 }}>(PDF, Excel, CSV, PNG, JPG · máx. 10 MB)</span></label>
              <div onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${file ? C.blue : C.border}`, borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: file ? C.accentLt : C.bg, transition: 'all 0.2s' }}
                onMouseEnter={e => { if (!file) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentLt; } }}
                onMouseLeave={e => { if (!file) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; } }}>
                <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg" onChange={handleFileChange} style={{ display: 'none' }} />
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    {isImage(file) ? (
                      <img src={URL.createObjectURL(file)} alt="preview"
                        style={{ width: 40, height: 40, borderRadius: '8px', objectFit: 'cover', border: `1px solid ${C.border}` }} />
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
            {error && <div style={{ padding: '10px 14px', background: C.dangerLt, border: `1.5px solid #FECACA`, borderRadius: '10px', color: C.danger, fontSize: '12px', fontWeight: '600' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '20px', border: `1.5px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" disabled={loading} style={{ padding: '10px 24px', borderRadius: '20px', border: 'none', background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`, color: '#fff', fontSize: '13px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1, display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 14px rgba(37,99,235,0.30)' }}>
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
      background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: '18px', padding: '20px 22px',
      display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: '0 2px 8px rgba(27,58,107,0.07)', borderTop: `4px solid ${accent}`,
      transition: 'box-shadow 0.2s, transform 0.15s', flex: 1, minWidth: 0,
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(27,58,107,0.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(27,58,107,0.07)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
      <div style={{ width: 52, height: 52, borderRadius: '15px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${iconBg}` }}>
        <Icon size={22} color={iconColor} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '32px', fontWeight: '900', color: C.navy, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '12px', color: C.muted, marginTop: 4, fontWeight: '600' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '10px', color: C.mutedLt, marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

// ─── LEADERBOARD VIEW ─────────────────────────────────────────────────────────
function LeaderboardView({ profiles, tasks }) {
  const now = new Date();
  const scores = profiles.map(profile => {
    const assigned = tasks.filter(t => t.assigned_to === profile.id);
    const completed = assigned.filter(t => t.status === 'completed').length;
    const overdue = assigned.filter(t => isOverdue(t.due_date, t.status)).length;
    const score = completed - overdue;
    return { ...profile, completed, overdue, total: assigned.length, score };
  }).sort((a, b) => b.score - a.score);

  const rankIcons = [
    { icon: Crown,  color: C.gold,   bg: C.goldLt,   label: '1°' },
    { icon: Medal,  color: C.silver, bg: '#F1F5F9',   label: '2°' },
    { icon: Trophy, color: C.bronze, bg: '#FEF3C7',   label: '3°' },
  ];

  const upcomingTasks = tasks
    .filter(t => t.due_date && t.status !== 'completed')
    .map(t => {
      const dueDate = new Date(t.due_date);
      const diff = dueDate - now;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return { ...t, daysLeft: days, dueDate };
    })
    .filter(t => t.daysLeft >= -1 && t.daysLeft <= 14)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 10);

  const getUrgencyStyle = (days) => {
    if (days < 0) return { color: C.danger, bg: C.dangerLt, border: '#FECACA', label: 'Vencida' };
    if (days === 0) return { color: C.danger, bg: '#FEE2E2', border: '#FECACA', label: 'Hoy' };
    if (days === 1) return { color: C.warn, bg: C.warnLt, border: '#FDE68A', label: 'Mañana' };
    if (days <= 3) return { color: C.warn, bg: C.warnLt, border: '#FDE68A', label: `${days} días` };
    return { color: C.accent, bg: C.accentLt, border: '#BFDBFE', label: `${days} días` };
  };

  return (
    <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: C.navy }}>🏆 Clasificación del Equipo</h2>
        <p style={{ margin: 0, fontSize: '13px', color: C.muted }}>+1 punto por tarea completada · -1 punto por tarea vencida</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          {scores.slice(0, 3).length > 0 && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end' }}>
              {scores.slice(0, 3).map((p, i) => {
                const ri = rankIcons[i];
                const heights = [140, 110, 95];
                return (
                  <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ textAlign: 'center' }}>
                      <Avatar name={p.full_name} size={i === 0 ? 52 : 40} photoUrl={p.avatar_url} />
                      <div style={{ fontSize: i === 0 ? '13px' : '11px', fontWeight: '800', color: C.navy, marginTop: 6, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name.split(' ')[0]}</div>
                      <div style={{ fontSize: '10px', color: C.muted, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cargo?.split(' ')[0]}</div>
                    </div>
                    <div style={{ width: '100%', height: heights[i], borderRadius: '14px 14px 0 0', background: `linear-gradient(to bottom, ${ri.bg}, ${ri.bg}dd)`, border: `2px solid ${ri.color}33`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <ri.icon size={i === 0 ? 24 : 18} color={ri.color} />
                      <div style={{ fontSize: i === 0 ? '28px' : '22px', fontWeight: '900', color: ri.color, letterSpacing: '-0.03em' }}>{p.score}</div>
                      <div style={{ fontSize: '9px', fontWeight: '700', color: ri.color, opacity: 0.7 }}>pts</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ background: C.surface, borderRadius: '20px', border: `1.5px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(27,58,107,0.07)' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: `linear-gradient(to right, ${C.navy}, ${C.blue})` }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tabla de posiciones</span>
            </div>
            {scores.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < scores.length - 1 ? `1px solid ${C.border}` : 'none', background: i === 0 ? `linear-gradient(to right, ${C.goldLt}88, transparent)` : i === 1 ? `linear-gradient(to right, #F1F5F988, transparent)` : i === 2 ? `linear-gradient(to right, ${C.warnLt}66, transparent)` : 'transparent', transition: 'background 0.2s' }}
                onMouseEnter={e => { if (i > 2) e.currentTarget.style.background = C.bg; }}
                onMouseLeave={e => { if (i > 2) e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 28, textAlign: 'center' }}>
                  {i < 3 ? React.createElement(rankIcons[i].icon, { size: 16, color: rankIcons[i].color }) : <span style={{ fontSize: '13px', fontWeight: '700', color: C.mutedLt }}>#{i + 1}</span>}
                </div>
                <Avatar name={p.full_name} size={36} photoUrl={p.avatar_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name}</div>
                  <div style={{ fontSize: '10px', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cargo}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: C.success }}>{p.completed}</div>
                    <div style={{ fontSize: '9px', color: C.mutedLt }}>✓</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: C.danger }}>-{p.overdue}</div>
                    <div style={{ fontSize: '9px', color: C.mutedLt }}>⚠</div>
                  </div>
                  <div style={{ minWidth: 48, textAlign: 'center', padding: '4px 10px', borderRadius: '20px', background: p.score > 0 ? C.successLt : p.score < 0 ? C.dangerLt : C.bg, border: `1.5px solid ${p.score > 0 ? '#BBF7D0' : p.score < 0 ? '#FECACA' : C.border}` }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: p.score > 0 ? C.success : p.score < 0 ? C.danger : C.muted }}>
                      {p.score > 0 ? '+' : ''}{p.score}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ background: C.surface, borderRadius: '20px', border: `1.5px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(27,58,107,0.07)' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: `linear-gradient(to right, ${C.navy}, ${C.blue})`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={14} color="rgba(255,255,255,0.8)" />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Próximas fechas límite</span>
            </div>
            <div style={{ padding: '8px 0', maxHeight: 420, overflowY: 'auto' }}>
              {upcomingTasks.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: C.mutedLt, fontSize: '13px' }}>
                  <Calendar size={32} color={C.border} style={{ margin: '0 auto 10px', display: 'block' }} />
                  Sin fechas próximas
                </div>
              ) : upcomingTasks.map(task => {
                const assignee = profiles.find(p => p.id === task.assigned_to);
                const urg = getUrgencyStyle(task.daysLeft);
                return (
                  <div key={task.id} style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: '12px', background: urg.bg, border: `1.5px solid ${urg.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: urg.color, lineHeight: 1 }}>{task.dueDate.getDate()}</div>
                      <div style={{ fontSize: '9px', fontWeight: '700', color: urg.color, textTransform: 'uppercase' }}>{task.dueDate.toLocaleString('es-PE', { month: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: C.navy, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {assignee && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Avatar name={assignee.full_name} size={16} photoUrl={assignee.avatar_url} />
                            <span style={{ fontSize: '10px', color: C.muted }}>{assignee.full_name.split(' ')[0]}</span>
                          </div>
                        )}
                        <span style={{ fontSize: '10px', fontWeight: '700', color: urg.color, background: urg.bg, padding: '1px 7px', borderRadius: '10px', border: `1px solid ${urg.border}` }}>{urg.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            {[
              { label: 'Promedio equipo', value: scores.length > 0 ? (scores.reduce((a, s) => a + s.score, 0) / scores.length).toFixed(1) : '0', color: C.blue, icon: BarChart2 },
              { label: 'Líder actual', value: scores[0]?.full_name?.split(' ')[0] || '—', color: C.gold, icon: Crown },
            ].map(({ label, value, color, icon: Ic }) => (
              <div key={label} style={{ background: C.surface, borderRadius: '14px', padding: '14px 16px', border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Ic size={16} color={color} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>{value}</div>
                  <div style={{ fontSize: '10px', color: C.muted }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TEAM VIEW ────────────────────────────────────────────────────────────────
function TeamView({ profiles, tasks, currentUserId, onAssignTask }) {
  const fileRef = useRef();

  const handlePhotoUpload = async (profileId, file) => {
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `avatars/${profileId}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { alert('Error subiendo foto: ' + upErr.message); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', profileId);
    window.location.reload();
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: C.navy }}>Miembros del equipo</h2>
        <p style={{ margin: 0, fontSize: '13px', color: C.muted }}>{profiles.length} colaboradores activos</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {profiles.map(profile => {
          const isMe = profile.id === currentUserId;
          const received  = tasks.filter(t => t.assigned_to === profile.id).length;
          const completed = tasks.filter(t => t.assigned_to === profile.id && t.status === 'completed').length;
          const pct = received > 0 ? Math.round((completed / received) * 100) : 0;
          return (
            <div key={profile.id} style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: '20px', padding: '28px 20px 20px', textAlign: 'center', boxShadow: '0 1px 4px rgba(27,58,107,0.06)', transition: 'box-shadow 0.2s, transform 0.15s', position: 'relative' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(27,58,107,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(27,58,107,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              {isMe && (
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <span style={{ fontSize: '9px', fontWeight: '700', background: C.accentLt, color: C.navy, padding: '2px 7px', borderRadius: '10px' }}>TÚ</span>
                </div>
              )}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                <Avatar name={profile.full_name} size={72} photoUrl={profile.avatar_url} />
                {isMe && (
                  <button onClick={() => fileRef.current?.click()}
                    style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: C.navy, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Camera size={11} color="#fff" />
                  </button>
                )}
              </div>
              {isMe && <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoUpload(currentUserId, e.target.files[0])} />}
              <div style={{ fontSize: '15px', fontWeight: '800', color: C.navy, marginBottom: 3 }}>{profile.full_name}</div>
              <div style={{ fontSize: '11px', color: C.muted, marginBottom: 10, padding: '3px 10px', background: C.bg, borderRadius: '20px', display: 'inline-block', border: `1px solid ${C.border}` }}>{profile.cargo || 'Colaborador'}</div>
              <div style={{ marginBottom: 14, padding: '10px 12px', background: C.bg, borderRadius: '12px', border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Cumplimiento</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: pct >= 70 ? C.success : pct >= 40 ? C.warn : C.danger }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: C.border, borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 70 ? C.success : pct >= 40 ? C.warn : C.danger, borderRadius: '10px', transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: '10px', color: C.mutedLt, marginTop: 5 }}>{completed} completadas de {received} recibidas</div>
              </div>
              <button onClick={() => onAssignTask(profile.id)}
                style={{ width: '100%', padding: '8px 0', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`, color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 3px 10px rgba(37,99,235,0.25)', transition: 'opacity 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <Plus size={13} /> Asignar tarea
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── DIRECT MESSAGE CONVERSATION ─────────────────────────────────────────────
function DMConversation({ otherUser, currentUserId, currentProfile, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const bottomRef  = useRef();
  const inputRef   = useRef();
  const fileRef    = useRef();

  const channelKey = [currentUserId, otherUser.id].sort().join('_');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          'and(sender_id.eq.' + currentUserId + ',receiver_id.eq.' + otherUser.id + '),and(sender_id.eq.' + otherUser.id + ',receiver_id.eq.' + currentUserId + ')'
        )
        .order('created_at', { ascending: true })
        .limit(200);
      if (data) setMessages(data);
      await supabase
        .from('direct_messages')
        .update({ read: true })
        .eq('receiver_id', currentUserId)
        .eq('sender_id', otherUser.id)
        .eq('read', false);
      setLoading(false);
    };
    load();

    const sub = supabase.channel('dm_' + channelKey)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        async payload => {
          const m = payload.new;
          const relevant = (m.sender_id === currentUserId && m.receiver_id === otherUser.id) ||
                           (m.sender_id === otherUser.id && m.receiver_id === currentUserId);
          if (!relevant) return;
          setMessages(prev => {
            if (prev.find(x => x.id === m.id)) return prev;
            return [...prev, m];
          });
          if (m.sender_id === otherUser.id && m.receiver_id === currentUserId) {
            await supabase.from('direct_messages').update({ read: true }).eq('id', m.id);
          }
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'direct_messages' },
        payload => setMessages(prev => prev.filter(m => m.id !== payload.old.id)))
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [otherUser.id]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;
    if (sending || uploadingFile) return;

    let fileUrl = null, fileName = null, fileType = null;

    if (selectedFile) {
      setUploadingFile(true);
      const ext = selectedFile.name.split('.').pop();
      const path = 'dm-files/' + currentUserId + '/' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
      const { error: upErr } = await supabase.storage.from('dm-files').upload(path, selectedFile);
      if (upErr) { console.error('Error subiendo archivo:', upErr); setUploadingFile(false); return; }
      const { data: urlData } = supabase.storage.from('dm-files').getPublicUrl(path);
      fileUrl  = urlData.publicUrl;
      fileName = selectedFile.name;
      fileType = selectedFile.type;
      setSelectedFile(null);
      setUploadingFile(false);
    }

    setSending(true);
    setText('');
    const { error } = await supabase.from('direct_messages').insert([{
      sender_id:   currentUserId,
      receiver_id: otherUser.id,
      content:     trimmed || null,
      file_url:    fileUrl,
      file_name:   fileName,
      file_type:   fileType,
    }]);
    if (error) { console.error('Error sending DM:', error); setText(trimmed); }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDelete = async (msgId) => {
    await supabase.from('direct_messages').delete().eq('id', msgId);
  };

  const handleClearChat = async () => {
    if (!window.confirm('¿Vaciar toda la conversación? Esto eliminará todos tus mensajes enviados en este chat.')) return;
    setClearingChat(true);
    await supabase
      .from('direct_messages')
      .delete()
      .eq('sender_id', currentUserId)
      .eq('receiver_id', otherUser.id);
    setClearingChat(false);
  };

  const items = (() => {
    const groups = [];
    let lastDate = null;
    messages.forEach(msg => {
      const d = new Date(msg.created_at).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
      if (d !== lastDate) { groups.push({ type: 'date', label: d }); lastDate = d; }
      groups.push({ type: 'msg', data: msg });
    });
    return groups;
  })();

  const isConsecutive = (idx) => {
    if (idx === 0) return false;
    const prev = items[idx - 1];
    const curr = items[idx];
    if (prev.type === 'date' || curr.type === 'date') return false;
    return prev.data?.sender_id === curr.data?.sender_id;
  };

  // Helper: detect image types
  const isImage = (type) => type && type.startsWith('image/');

  return (
    <div style={{ flex: 1, background: C.surface, borderRadius: '20px', border: '1.5px solid ' + C.border, boxShadow: '0 2px 8px rgba(27,58,107,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid ' + C.border, display: 'flex', alignItems: 'center', gap: 12, background: C.surface }}>
        <button onClick={onBack} style={{ background: C.bg, border: '1px solid ' + C.border, borderRadius: '8px', padding: '6px', cursor: 'pointer', color: C.muted, display: 'flex', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = C.accentLt; e.currentTarget.style.color = C.navy; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.muted; }}>
          <ArrowLeft size={14} />
        </button>
        <Avatar name={otherUser.full_name} size={38} photoUrl={otherUser.avatar_url} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: C.navy }}>{otherUser.full_name}</div>
          <div style={{ fontSize: '11px', color: C.muted }}>{otherUser.cargo}</div>
        </div>
        {/* Vaciar chat button */}
        <button
          onClick={handleClearChat}
          disabled={clearingChat || messages.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: '20px',
            border: '1.5px solid ' + C.dangerLt,
            background: 'transparent',
            color: messages.length === 0 ? C.mutedLt : C.danger,
            fontSize: '11px', fontWeight: '700',
            cursor: (clearingChat || messages.length === 0) ? 'not-allowed' : 'pointer',
            opacity: messages.length === 0 ? 0.5 : 1,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { if (messages.length > 0) { e.currentTarget.style.background = C.dangerLt; } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          {clearingChat
            ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
            : <Trash size={11} />
          }
          Vaciar chat
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={24} color={C.accent} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.mutedLt, gap: 12 }}>
            <Avatar name={otherUser.full_name} size={56} photoUrl={otherUser.avatar_url} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: C.muted, marginBottom: 4 }}>Inicia una conversación</div>
              <div style={{ fontSize: '12px' }}>Escribe tu primer mensaje a {otherUser.full_name.split(' ')[0]}</div>
            </div>
          </div>
        ) : (
          items.map((item, idx) => {
            if (item.type === 'date') {
              return (
                <div key={'date-' + idx} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 8px' }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: '10px', fontWeight: '700', color: C.mutedLt, textTransform: 'capitalize', background: C.bg, padding: '3px 10px', borderRadius: '20px', border: '1px solid ' + C.border }}>{item.label}</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>
              );
            }
            const msg = item.data;
            const isMe = msg.sender_id === currentUserId;
            const consecutive = isConsecutive(idx);
            return (
              <div key={msg.id}
                style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 10, marginTop: consecutive ? 3 : 14, alignItems: 'flex-end' }}
                onMouseEnter={() => setHoveredMsg(msg.id)}
                onMouseLeave={() => setHoveredMsg(null)}>
                <div style={{ width: 32, flexShrink: 0 }}>
                  {!consecutive && (
                    <Avatar name={isMe ? currentProfile?.full_name || '' : otherUser.full_name} size={32}
                      photoUrl={isMe ? currentProfile?.avatar_url : otherUser.avatar_url} />
                  )}
                </div>
                <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {!consecutive && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: C.navy }}>{isMe ? 'Tú' : otherUser.full_name.split(' ')[0]}</span>
                      <span style={{ fontSize: '10px', color: C.mutedLt }}>{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                    <div style={{
                      padding: '9px 14px',
                      borderRadius: consecutive
                        ? (isMe ? '18px 6px 6px 18px' : '6px 18px 18px 6px')
                        : (isMe ? '18px 6px 18px 18px' : '6px 18px 18px 18px'),
                      background: isMe ? ('linear-gradient(135deg, ' + C.navy + ' 0%, ' + C.blue + ' 100%)') : C.bg,
                      color: isMe ? '#fff' : C.text,
                      fontSize: '13px', lineHeight: '1.5',
                      border: isMe ? 'none' : ('1.5px solid ' + C.border),
                      boxShadow: isMe ? '0 2px 8px rgba(37,99,235,0.20)' : '0 1px 3px rgba(27,58,107,0.06)',
                      wordBreak: 'break-word', whiteSpace: 'pre-wrap', maxWidth: '100%',
                    }}>
                      {/* IMAGE preview */}
                      {msg.file_url && isImage(msg.file_type) && (
                        <div style={{ marginBottom: msg.content ? 8 : 0 }}>
                          <img
                            src={msg.file_url}
                            alt={msg.file_name || 'imagen'}
                            style={{ maxWidth: '220px', maxHeight: '200px', borderRadius: '10px', display: 'block', objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => window.open(msg.file_url, '_blank')}
                          />
                        </div>
                      )}
                      {/* NON-IMAGE file */}
                      {msg.file_url && !isImage(msg.file_type) && (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', borderRadius: '8px',
                            background: isMe ? 'rgba(255,255,255,0.15)' : C.surface,
                            border: '1px solid ' + (isMe ? 'rgba(255,255,255,0.2)' : C.border),
                            textDecoration: 'none', marginBottom: msg.content ? 8 : 0,
                          }}
                        >
                          <FileText size={16} color={isMe ? '#fff' : C.accent} />
                          <span style={{ fontSize: '12px', fontWeight: '600', color: isMe ? '#fff' : C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                            {msg.file_name}
                          </span>
                          <ExternalLink size={11} color={isMe ? 'rgba(255,255,255,0.6)' : C.muted} />
                        </a>
                      )}
                      {msg.content && <span>{msg.content}</span>}
                    </div>
                    {isMe && hoveredMsg === msg.id && (
                      <button onClick={() => handleDelete(msg.id)}
                        style={{ background: C.dangerLt, border: '1px solid #FECACA', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: C.danger, display: 'flex', flexShrink: 0 }}>
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                  {isMe && idx === items.length - 1 && (
                    <div style={{ fontSize: '9px', color: msg.read ? C.accent : C.mutedLt, marginTop: 2, textAlign: 'right', paddingRight: 4 }}>
                      {msg.read ? '✓✓ Visto' : '✓ Enviado'}
                    </div>
                  )}
                  {consecutive && (
                    <div style={{ fontSize: '9px', color: C.mutedLt, marginTop: 1 }}>{formatTime(msg.created_at)}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid ' + C.border, background: C.surface }}>
        {selectedFile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 8, background: C.accentLt, borderRadius: '10px', border: '1px solid ' + C.border }}>
            {isImage(selectedFile.type) ? (
              <img src={URL.createObjectURL(selectedFile)} alt="preview" style={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '6px', background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid ' + C.border }}>
                <FileText size={16} color={C.accent} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: C.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile.name}</div>
              <div style={{ fontSize: '10px', color: C.muted }}>{(selectedFile.size / 1024).toFixed(1)} KB</div>
            </div>
            <button onClick={() => setSelectedFile(null)}
              style={{ background: C.dangerLt, border: '1px solid #FECACA', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: C.danger, display: 'flex', flexShrink: 0 }}>
              <X size={11} />
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: C.bg, borderRadius: '16px', border: '1.5px solid ' + C.border, padding: '8px 8px 8px 12px', transition: 'border-color 0.15s' }}
          onFocusCapture={e => e.currentTarget.style.borderColor = C.blue}
          onBlurCapture={e => e.currentTarget.style.borderColor = C.border}>
          {/* Accept ALL file types */}
          <input ref={fileRef} type="file" accept="image/*,.pdf,.xlsx,.xls,.csv,.doc,.docx,.txt,.zip,.rar,.ppt,.pptx" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files[0]; if (f) setSelectedFile(f); e.target.value = ''; }} />
          <button onClick={() => fileRef.current?.click()}
            style={{ width: 34, height: 34, borderRadius: '10px', border: 'none', background: selectedFile ? C.accentLt : 'transparent', color: selectedFile ? C.blue : C.mutedLt, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = C.accentLt; e.currentTarget.style.color = C.blue; }}
            onMouseLeave={e => { if (!selectedFile) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.mutedLt; } }}>
            <Paperclip size={16} />
          </button>
          <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={'Mensaje a ' + otherUser.full_name.split(' ')[0] + '...'} rows={1}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit', fontSize: '13px', color: C.text, lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto', padding: '4px 0' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }} />
          <button onClick={handleSend} disabled={(!text.trim() && !selectedFile) || sending || uploadingFile}
            style={{ width: 38, height: 38, borderRadius: '12px', border: 'none', background: (text.trim() || selectedFile) && !sending && !uploadingFile ? ('linear-gradient(135deg, ' + C.navy + ' 0%, ' + C.blue + ' 100%)') : C.border, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (text.trim() || selectedFile) && !sending && !uploadingFile ? 'pointer' : 'not-allowed', flexShrink: 0, transition: 'all 0.15s' }}>
            {sending || uploadingFile ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
          </button>
        </div>
        <div style={{ fontSize: '10px', color: C.mutedLt, marginTop: 5, paddingLeft: 4 }}>Enter para enviar · Shift+Enter para nueva línea · 📎 para adjuntar</div>
      </div>
    </div>
  );
}
// ─── CHAT VIEW (DM LIST) ──────────────────────────────────────────────────────
function ChatView({ profiles, currentUserId, currentProfile }) {
  const otherProfiles = profiles.filter(p => p.id !== currentUserId);
  const [selectedUser, setSelectedUser] = useState(otherProfiles[0] || null);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Cargar contadores de no leídos al iniciar y suscribirse a Realtime
  useEffect(() => {
    const fetchUnread = async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('sender_id')
        .eq('receiver_id', currentUserId)
        .eq('read', false);

      if (data) {
        const counts = {};
        data.forEach(msg => {
          counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
        });
        setUnreadCounts(counts);
      }
    };
    fetchUnread();

    const sub = supabase.channel('global_unread_channel_' + currentUserId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' },
        () => {
          // Recargar directamente de la base de datos ante cualquier cambio
          fetchUnread();
        })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [currentUserId, selectedUser]);

  // Limpiar instantáneamente el contador del usuario al seleccionarlo
  useEffect(() => {
    if (selectedUser) {
      setUnreadCounts(prev => ({
        ...prev,
        [selectedUser.id]: 0
      }));
    }
  }, [selectedUser]);

  return (
    <div style={{ animation: 'fadeUp 0.3s ease-out', height: 'calc(100vh - 220px)', display: 'flex', gap: 20 }}>
      {/* Sidebar */}
      <div style={{ width: 240, flexShrink: 0, background: C.surface, borderRadius: '20px', border: `1.5px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(27,58,107,0.07)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}`, background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={14} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>Mensajes directos</span>
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{otherProfiles.length} contactos</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {otherProfiles.map(p => (
            <div key={p.id} onClick={() => setSelectedUser(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s', background: selectedUser?.id === p.id ? C.accentLt : 'transparent', borderLeft: selectedUser?.id === p.id ? `3px solid ${C.blue}` : '3px solid transparent' }}
              onMouseEnter={e => { if (selectedUser?.id !== p.id) e.currentTarget.style.background = C.bg; }}
              onMouseLeave={e => { if (selectedUser?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar name={p.full_name} size={34} photoUrl={p.avatar_url} />
               
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: selectedUser?.id === p.id ? C.navy : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name}</div>
                <div style={{ fontSize: '10px', color: C.mutedLt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cargo?.split(' ').slice(0, 2).join(' ')}</div>
              </div>
              {/* Globo indicador de mensajes no leídos (se oculta si es el chat activo) */}
              {unreadCounts[p.id] > 0 && selectedUser?.id !== p.id && (
                <div style={{
                  background: C.danger,
                  color: '#fff',
                  borderRadius: '50%',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 5px',
                  fontSize: '9px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 6
                }}>
                  {unreadCounts[p.id]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {selectedUser ? (
        <DMConversation
          otherUser={selectedUser}
          currentUserId={currentUserId}
          currentProfile={currentProfile}
        />
      ) : (
        <div style={{ flex: 1, background: C.surface, borderRadius: '20px', border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.mutedLt }}>
          Selecciona una conversación para comenzar
        </div>
      )}
    </div>
  );
}
// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // Busque los useState de App y agregue esta línea:
  const [totalUnreadDMs, setTotalUnreadDMs] = useState(0);
  const [session,       setSession]       = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [profiles,      setProfiles]      = useState([]);
  const [tasks,         setTasks]         = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs,    setShowNotifs]    = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNewTask,   setShowNewTask]   = useState(false);
  const [preAssignTo,   setPreAssignTo]   = useState(null);
  const [activeTab,     setActiveTab]     = useState('mine');
  const [authLoading,   setAuthLoading]   = useState(true);
  const [selectedTask,  setSelectedTask]  = useState(null);

  // Auth form
  const [authMode,    setAuthMode]    = useState('login');
  const [username,    setUsername]    = useState('');
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
    if (!session) return;
    loadProfile(); loadProfiles(); loadTasks(); loadNotifications();
    const notifSub = supabase.channel('notifs_' + session.user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        payload => setNotifications(prev => [payload.new, ...prev])).subscribe();
    const taskSub = supabase.channel('tasks_global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' },
        payload => setTasks(prev => [payload.new, ...prev.filter(t => t.id !== payload.new.id)]))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' },
        payload => setTasks(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tasks' },
        payload => setTasks(prev => prev.filter(t => t.id !== payload.old.id)))
      .subscribe();
    return () => { supabase.removeChannel(notifSub); supabase.removeChannel(taskSub); };
  }, [session]);

  // Cargar y suscribirse a la cuenta global de mensajes no leídos de todos los chats
  useEffect(() => {
    if (!session) return;

    const fetchTotalUnread = async () => {
      const { data } = await supabase
        .from('direct_messages')
        .select('id')
        .eq('receiver_id', session.user.id)
        .eq('read', false);
      if (data) setTotalUnreadDMs(data.length);
    };
    fetchTotalUnread();

    const channel = supabase.channel('global_unread_dms_' + session.user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' },
        () => {
          // Recalculamos el total de forma segura para cualquier tipo de cambio (insert, update, delete)
          fetchTotalUnread();
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const loadProfile       = async () => { const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single(); if (data) setProfile(data); };
  const loadProfiles      = async () => { const { data } = await supabase.from('profiles').select('*'); if (data) setProfiles(data); };
  const loadTasks         = async () => { const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }); if (data) setTasks(data); };
  const loadNotifications = async () => { const { data } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(25); if (data) setNotifications(data); };

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

  const handleDelete = async (taskId) => {
    if (!window.confirm('¿Eliminar este ticket?')) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) { console.error('Error deleting task:', error); loadTasks(); }
  };

  const markNotifsRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleProfileUpdated = (updatedProfile) => {
    setProfile(updatedProfile);
    setProfiles(prev => prev.map(p => p.id === updatedProfile.id ? updatedProfile : p));
  };


  // ── AUTH ──────────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (authMode === 'signup') {
      if (!username.trim())   e.username  = 'Ingresa tu usuario';
      if (!firstName.trim())  e.firstName = 'Ingresa tu nombre';
      if (!lastName.trim())   e.lastName  = 'Ingresa tu apellido';
      if (!cargo.trim())      e.cargo     = 'Ingresa tu cargo';
      if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    } else {
      if (!loginEmail.trim()) e.loginEmail = 'El correo es obligatorio';
      if (password.length < 6) e.password = 'Mínimo 6 caracteres';
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
    const email = `${username.trim().toLowerCase()}${DOMAIN}`;
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), cargo: cargo.trim(), full_name: `${firstName.trim()} ${lastName.trim()}` } },
    });
    if (err) { setAuthError(err.message); setFormLoading(false); return; }
    setAuthMode('login');
    setLoginEmail(email);
    setPassword('');
    setUsername(''); setFirstName(''); setLastName(''); setCargo('');
    setFieldErrors({});
    setSuccessMsg(`¡Cuenta creada con éxito! Ya puedes ingresar con ${email}`);
    setFormLoading(false);
  };

  const resetForm = () => {
    setUsername(''); setFirstName(''); setLastName(''); setCargo('');
    setLoginEmail(''); setPassword('');
    setFieldErrors({}); setAuthError(null); setSuccessMsg(null);
  };

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const myTasks      = tasks.filter(t => t.assigned_to === session?.user.id);
  const myPending    = myTasks.filter(t => t.status !== 'completed').length;
  const myCompleted  = myTasks.filter(t => t.status === 'completed').length;
  const overdueCount = myTasks.filter(t => isOverdue(t.due_date, t.status)).length;
  const unread = notifications.filter(n => !n.read).length;

  // ── FILTERED TASKS ────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'mine')      return t.assigned_to === session?.user.id && t.status !== 'completed';
    if (activeTab === 'all')       return true;
    if (activeTab === 'created')   return t.created_by  === session?.user.id;
    // "completed" tab: only show current user's completed tasks
    if (activeTab === 'completed') return t.assigned_to === session?.user.id && t.status === 'completed';
    return true;
  });

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
    const isTeamView    = activeTab === 'team';
    const isLeaderboard = activeTab === 'analytics';
    const isChatView    = activeTab === 'chat';

    const TAB_CONFIG = [
      { id: 'mine',      label: 'Mis Pendientes', icon: Clock          },
      { id: 'all',       label: 'Todas',          icon: LayoutDashboard },
      { id: 'created',   label: 'Creadas por mí', icon: Briefcase      },
      { id: 'completed', label: 'Completadas',    icon: CheckCircle2   },
      { id: 'team',      label: 'Equipo',         icon: Users          },
      { id: 'analytics', label: 'Analítica',      icon: Trophy         },
      { id: 'chat',      label: 'Mensajes',       icon: MessageCircle  },
    ];

    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&display=swap');
          @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
          *{box-sizing:border-box} body{margin:0}
          ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
          input::placeholder{color:${C.mutedLt}} textarea::placeholder{color:${C.mutedLt}}
          select option{background:${C.surface};color:${C.text}}
        `}</style>

        {/* NAVBAR */}
        <header style={{ width: '100%', height: '64px', background: C.surface, borderBottom: `1.5px solid ${C.border}`, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(27,58,107,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', overflow: 'hidden', border: `1.5px solid ${C.border}`, flexShrink: 0 }}>
              <img src={LOGO_URL} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
            </div>
            <div>
              <span style={{ fontWeight: '800', fontSize: '15px', color: C.navy }}>Hanter</span>
              <span style={{ fontWeight: '400', fontSize: '15px', color: C.accent, marginLeft: 4 }}>Workspace</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setShowNotifs(v => !v); setShowProfileMenu(false); if (!showNotifs) markNotifsRead(); }}
                style={{ position: 'relative', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: '10px', padding: '7px', cursor: 'pointer', color: C.navy, display: 'flex', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                <Bell size={17} />
                {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: C.danger, color: '#fff', borderRadius: '50%', width: 17, height: 17, fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread > 9 ? '9+' : unread}</span>}
              </button>
              {showNotifs && (
                <div style={{ position: 'absolute', right: 0, top: '50px', background: C.surface, borderRadius: '16px', width: '310px', border: `1.5px solid ${C.border}`, boxShadow: '0 12px 40px rgba(27,58,107,0.15)', overflow: 'hidden', zIndex: 200, animation: 'slideDown 0.15s ease-out' }}>
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: C.navy }}>Notificaciones</h4>
                    {unread > 0 && <span style={{ fontSize: '10px', background: C.accentLt, color: C.navy, padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>{unread} nuevas</span>}
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0
                      ? <p style={{ padding: '24px', textAlign: 'center', color: C.mutedLt, fontSize: '12px' }}>Sin notificaciones</p>
                      : notifications.map(n => (
                        <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: n.read ? 'transparent' : C.accentLt }}>
                          <p style={{ margin: 0, fontSize: '12px', color: C.text, lineHeight: '1.45' }}>{n.message}</p>
                          <span style={{ fontSize: '10px', color: C.mutedLt }}>{formatDate(n.created_at)}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>

            {/* Profile button */}
            {profile && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => { setShowProfileMenu(v => !v); setShowNotifs(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 10px 5px 5px', borderRadius: '100px',
                    border: `1.5px solid ${showProfileMenu ? C.blue : C.border}`,
                    background: showProfileMenu ? C.accentLt : C.bg,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!showProfileMenu) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentLt; } }}
                  onMouseLeave={e => { if (!showProfileMenu) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; } }}
                >
                  <Avatar name={profile.full_name} size={30} photoUrl={profile.avatar_url} />
                  <div style={{ lineHeight: '1.2', textAlign: 'left' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: C.navy }}>{profile.full_name}</div>
                    <div style={{ fontSize: '10px', color: C.muted }}>{profile.cargo}</div>
                  </div>
                  <ChevronDown size={12} color={C.muted} style={{ marginLeft: 2, transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </button>

                {showProfileMenu && (
                  <ProfileMenu
                    profile={profile}
                    currentUserId={session.user.id}
                    onClose={() => setShowProfileMenu(false)}
                    onProfileUpdated={handleProfileUpdated}
                  />
                )}
              </div>
            )}

            <button onClick={() => supabase.auth.signOut()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', background: C.bg, border: `1.5px solid ${C.border}`, color: C.muted, padding: '7px 14px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.dangerLt; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = C.danger; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
              <LogOut size={13} /> Salir
            </button>
          </div>
        </header>

        {/* MAIN */}
        <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '32px 28px', animation: 'fadeUp 0.4s ease-out' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
            {/* Tab navigation */}
            <div style={{ background: C.surface, borderRadius: '14px', padding: '5px', display: 'flex', flexDirection: 'column', gap: 3, border: `1.5px solid ${C.border}`, boxShadow: '0 2px 8px rgba(27,58,107,0.07)', minWidth: 180, flexShrink: 0 }}>
              {TAB_CONFIG.map(({ id, label, icon: Ic }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  style={{
                    padding: '9px 14px', borderRadius: '10px', border: 'none',
                    background: activeTab === id ? `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)` : 'transparent',
                    color: activeTab === id ? '#fff' : C.muted,
                    fontWeight: activeTab === id ? '700' : '500',
                    fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                    boxShadow: activeTab === id ? '0 3px 10px rgba(37,99,235,0.25)' : 'none',
                  }}
                  onMouseEnter={e => { if (activeTab !== id) { e.currentTarget.style.background = C.accentLt; e.currentTarget.style.color = C.navy; } }}
                  onMouseLeave={e => { if (activeTab !== id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted; } }}
                >
                  <Ic size={13} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {id === 'chat' && totalUnreadDMs > 0 && (
                    <span style={{
                      background: C.danger,
                      color: '#fff',
                      borderRadius: '20px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: '700',
                      lineHeight: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {totalUnreadDMs}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Stat cards + New task button */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: C.muted, fontWeight: '500', marginBottom: 2 }}>{profile?.cargo}</div>
                </div>
                {!isChatView && (
                  <button onClick={() => { setPreAssignTo(null); setShowNewTask(true); }}
                    style={{ padding: '10px 22px', background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`, color: '#fff', border: 'none', borderRadius: '20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(37,99,235,0.30)', transition: 'all 0.15s', flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    <Plus size={16} /> Nueva Tarea
                  </button>
                )}
              </div>
              {!isChatView && (
                <div style={{ display: 'flex', gap: 14 }}>
                  <StatCard icon={Clock} label="Mis Pendientes" value={myPending} iconColor={C.accent} iconBg={C.accentLt} accent={C.accent} sublabel="tareas sin completar" />
                  <StatCard icon={CheckCircle2} label="Completadas" value={myCompleted} iconColor={C.success} iconBg={C.successLt} accent={C.success} sublabel="tareas finalizadas" />
                  <StatCard icon={AlertCircle} label="Vencidas" value={overdueCount} iconColor={C.danger} iconBg={C.dangerLt} accent={C.danger} sublabel="requieren atención" />
                </div>
              )}
            </div>
          </div>

          {/* VIEWS */}
          {isChatView ? (
            <ChatView profiles={profiles} currentUserId={session.user.id} currentProfile={profile} />
          ) : isLeaderboard ? (
            <LeaderboardView tasks={tasks} profiles={profiles} />
          ) : isTeamView ? (
            <TeamView profiles={profiles} tasks={tasks} currentUserId={session.user.id} onAssignTask={(id) => { setPreAssignTo(id); setShowNewTask(true); }} />
          ) : activeTab === 'mine' ? (
            // "Mis Pendientes" — solo 2 columnas: Por Hacer y En Proceso
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {STATUS_COLS_MINE.map(col => {
                const colTasks = filteredTasks.filter(t => t.status === col.status);
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
                        <TicketCard key={task.id} task={task} currentUserId={session.user.id}
                          profiles={profiles} onStatusChange={handleStatusChange}
                          onDelete={handleDelete} onViewDetail={setSelectedTask} />
                      ))
                    }
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'completed' ? (
            // "Completadas" — lista plana de las tareas completadas del usuario
            <div style={{ maxWidth: '720px' }}>
              {filteredTasks.length === 0
                ? <div style={{ border: `2px dashed ${C.border}`, borderRadius: '14px', padding: '48px', textAlign: 'center', color: C.mutedLt }}>
                    <CheckCircle2 size={32} color={C.border} style={{ margin: '0 auto 12px', display: 'block' }} />
                    <div style={{ fontSize: '14px', fontWeight: '600', color: C.muted, marginBottom: 4 }}>Sin tareas completadas aún</div>
                    <div style={{ fontSize: '12px' }}>Aquí aparecerán tus tareas una vez que las marques como realizadas</div>
                  </div>
                : filteredTasks.map(task => (
                  <TicketCard key={task.id} task={task} currentUserId={session.user.id}
                    profiles={profiles} onStatusChange={handleStatusChange}
                    onDelete={handleDelete} onViewDetail={setSelectedTask} />
                ))
              }
            </div>
          ) : (
            // "Todas" y "Creadas por mí" — 3 columnas
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
              {STATUS_COLS.map(col => {
                const colTasks = filteredTasks.filter(t => t.status === col.status);
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
                        <TicketCard key={task.id} task={task} currentUserId={session.user.id}
                          profiles={profiles} onStatusChange={handleStatusChange}
                          onDelete={handleDelete} onViewDetail={setSelectedTask} />
                      ))
                    }
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {showNewTask && (
          <NewTaskModal profiles={profiles} currentUserId={session.user.id} preAssignTo={preAssignTo}
            onClose={() => { setShowNewTask(false); setPreAssignTo(null); }}
            onCreated={t => setTasks(prev => [t, ...prev])} />
        )}
        {selectedTask && (
          <TaskDetailModal task={selectedTask} profiles={profiles} currentUserId={session.user.id}
            onClose={() => setSelectedTask(null)} onStatusChange={handleStatusChange} onDelete={handleDelete} />
        )}
        {showNotifs && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => { setShowNotifs(false); }} />}
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
          <h1 style={{ margin: '0 0 4px', fontSize: '64px', fontWeight: '900', lineHeight: '1', letterSpacing: '-0.04em', color: '#fff' }}>Hanter</h1>
          <h1 style={{ margin: '0 0 24px', fontSize: '64px', fontWeight: '900', lineHeight: '1', letterSpacing: '-0.04em', color: C.accent }}>Workspace</h1>
          <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.55)', fontWeight: '300', lineHeight: '1.80', maxWidth: '380px' }}>
            Hanter impulsa la transformación digital de empresas mediante el desarrollo de aplicaciones, páginas web y soluciones de automatización, ofreciendo tecnología innovadora, eficiente y confiable para optimizar procesos y potenciar resultados.
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
              {authMode === 'signup' && (
                <>
                  <div>
                    <label style={darkLbl}>Usuario *</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input className="dark-input" style={{ ...darkInp, borderRadius: '10px 0 0 10px', ...(fieldErrors.username ? errBorder : {}) }}
                        placeholder="donan.chavez" value={username}
                        onChange={e => { setUsername(e.target.value.replace(/\s/g, '').toLowerCase()); setFieldErrors(x => ({ ...x, username: undefined })); }} required />
                      <div style={{ height: '46px', padding: '0 12px', background: C.accentLt, border: `1.5px solid rgba(0,0,0,0.12)`, borderLeft: 'none', borderRadius: '0 10px 10px 0', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', fontSize: '13px', color: C.blue, fontWeight: '600' }}>
                        {DOMAIN}
                      </div>
                    </div>
                    {fieldErrors.username && <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.danger }}>{fieldErrors.username}</p>}
                    <p style={{ margin: '4px 0 0', fontSize: '10px', color: C.muted }}>Tu correo será: {username || 'usuario'}{DOMAIN}</p>
                  </div>
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
                    <label style={darkLbl}>Cargo *</label>
                    <input list="cargo-opts" className="dark-input" style={{ ...darkInp, ...(fieldErrors.cargo ? errBorder : {}) }}
                      placeholder="Escribe o selecciona tu cargo..." value={cargo}
                      onChange={e => { setCargo(e.target.value); setFieldErrors(x => ({ ...x, cargo: undefined })); }} required />
                    <datalist id="cargo-opts">{CARGO_OPTIONS.map(c => <option key={c} value={c} />)}</datalist>
                    {fieldErrors.cargo && <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.danger }}>{fieldErrors.cargo}</p>}
                  </div>
                </>
              )}

              {authMode === 'login' && (
                <div>
                  <label style={darkLbl}>Correo electrónico</label>
                  <input className="dark-input" style={{ ...darkInp, ...(fieldErrors.loginEmail ? errBorder : {}) }}
                    type="email" placeholder="donan.chavez@hanter.com.pe"
                    value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setFieldErrors(x => ({ ...x, loginEmail: undefined })); }} required />
                  {fieldErrors.loginEmail && <p style={{ margin: '3px 0 0', fontSize: '10px', color: C.danger }}>{fieldErrors.loginEmail}</p>}
                </div>
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