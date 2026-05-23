import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './lib/supabase';
import {
  Eye, EyeOff, LogOut, Plus, Calendar,
  CheckCircle2, Clock, AlertCircle, Trash2,
  Bell, X, AlertTriangle, Loader2, Send,
  ChevronDown, Briefcase, LayoutDashboard,
  CheckSquare, Users, Zap, Search, FileText,
  Upload, Paperclip, ExternalLink, ChevronRight,
  UserCircle, Camera, Shield, Award,
} from 'lucide-react';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const BG_IMAGE = "https://img.magnific.com/foto-gratis/colegas-sonrientes-tiro-medio-trabajo_23-2149308453.jpg?semt=ais_hybrid&w=740&q=80";

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
  darkBg:    '#0A0F1E',
  darkCard:  '#111827',
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
  { status: 'pending',     label: 'Por Hacer',   dot: C.mutedLt,  tag: '#F1F5F9', tagText: C.muted  },
  { status: 'in_progress', label: 'En Proceso',  dot: C.blue,     tag: C.accentLt, tagText: C.navy  },
  { status: 'completed',   label: 'Completado',  dot: C.success,  tag: C.successLt, tagText: C.success },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function isOverdue(due, status) {
  if (!due || status === 'completed') return false;
  return new Date(due) < new Date();
}
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

// ─── UI PRIMITIVES ───────────────────────────────────────────────────────────
function Avatar({ name = '', size = 32, photoUrl = null }) {
  const colors = [
    ['#DBEAFE','#1B3A6B'], ['#EDE9FE','#5B21B6'],
    ['#DCFCE7','#15803D'], ['#FEF3C7','#B45309'],
    ['#FCE7F3','#9D174D'], ['#F0FDF4','#166534'],
  ];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const [bg, fg] = colors[h % colors.length];

  if (photoUrl) {
    return (
      <img src={photoUrl} alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${C.border}` }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: '700', flexShrink: 0,
      fontFamily: "'Sora', sans-serif",
    }}>
      {initials(name) || '?'}
    </div>
  );
}

function Chip({ children, color, bg, border }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: '20px',
      fontSize: '10px', fontWeight: '700', letterSpacing: '0.03em',
      color, background: bg, border: `1px solid ${border}`,
    }}>
      {children}
    </span>
  );
}

// ─── TASK DETAIL MODAL ────────────────────────────────────────────────────────
function TaskDetailModal({ task, profiles, currentUserId, onClose, onStatusChange, onDelete }) {
  if (!task) return null;
  const assignee = profiles.find(p => p.id === task.assigned_to);
  const creator  = profiles.find(p => p.id === task.created_by);
  const overdue  = isOverdue(task.due_date, task.status);
  const isCreator  = task.created_by  === currentUserId;
  const isAssigned = task.assigned_to === currentUserId;
  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const sCfg = STATUS_COLS.find(s => s.status === task.status) || STATUS_COLS[0];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div style={{ background: C.surface, borderRadius: '24px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', border: `1.5px solid ${C.border}`, boxShadow: '0 32px 80px rgba(27,58,107,0.22)' }}>
        {/* Header stripe */}
        <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`, borderRadius: '22px 22px 0 0', padding: '28px 28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontWeight: '600', letterSpacing: '0.05em' }}>
                  #{task.id.substring(0, 8).toUpperCase()}
                </span>
                <Chip color={pCfg.color} bg={pCfg.bg} border={pCfg.border}>{pCfg.label}</Chip>
                <span style={{ fontSize: '10px', padding: '2px 9px', borderRadius: '20px', background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: '700' }}>
                  {sCfg.label}
                </span>
                {overdue && <Chip color={C.danger} bg={C.dangerLt} border="#FECACA">Vencida</Chip>}
              </div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#fff', lineHeight: '1.3', letterSpacing: '-0.02em' }}>
                {task.title}
              </h2>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#fff', display: 'flex', marginLeft: 12, flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px' }}>
          {/* Description */}
          <div style={{ marginBottom: 24 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: '700', color: C.navy, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Descripción</h4>
            {task.description
              ? <p style={{ margin: 0, fontSize: '14px', color: C.text, lineHeight: '1.75', background: C.bg, padding: '16px', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                  {task.description}
                </p>
              : <p style={{ margin: 0, fontSize: '13px', color: C.mutedLt, fontStyle: 'italic' }}>Sin descripción</p>
            }
          </div>

          {/* Attachment */}
          {task.file_url && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: '700', color: C.navy, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Archivo adjunto</h4>
              <a href={task.file_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: '10px', border: `1.5px solid ${C.accentLt}`, background: C.accentLt, color: C.navy, fontSize: '13px', fontWeight: '600', textDecoration: 'none', transition: 'all 0.15s' }}>
                <Paperclip size={14} color={C.accent} />
                {task.file_name || 'Ver archivo adjunto'}
                <ExternalLink size={12} color={C.muted} />
              </a>
            </div>
          )}

          {/* Meta grid */}
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

          {/* Completion */}
          {task.status === 'completed' && task.completed_at && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: C.successLt, borderRadius: '12px', marginBottom: 24, border: `1px solid #BBF7D0` }}>
              <CheckCircle2 size={16} color={C.success} />
              <span style={{ fontSize: '13px', color: C.success, fontWeight: '600' }}>Completado el {formatDate(task.completed_at)}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {(isAssigned || isCreator) && task.status !== 'completed' && (
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
  const assignee = profiles.find(p => p.id === task.assigned_to);
  const creator  = profiles.find(p => p.id === task.created_by);
  const overdue  = isOverdue(task.due_date, task.status);
  const isCreator  = task.created_by  === currentUserId;
  const isAssigned = task.assigned_to === currentUserId;
  const pCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <div style={{
      background: C.surface,
      border: `1.5px solid ${overdue ? '#FECACA' : C.border}`,
      borderLeft: `4px solid ${pCfg.color}`,
      borderRadius: '14px', padding: '16px',
      marginBottom: '10px',
      boxShadow: overdue ? '0 2px 12px rgba(220,38,38,0.08)' : '0 1px 4px rgba(27,58,107,0.06)',
      transition: 'box-shadow 0.2s, transform 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(27,58,107,0.11)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(27,58,107,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', color: C.mutedLt, fontFamily: 'monospace', fontWeight: '600' }}>
              #{task.id.substring(0, 8).toUpperCase()}
            </span>
            <Chip color={pCfg.color} bg={pCfg.bg} border={pCfg.border}>{pCfg.label}</Chip>
            {overdue && <Chip color={C.danger} bg={C.dangerLt} border="#FECACA">Vencida</Chip>}
            {task.file_url && <Chip color={C.accent} bg={C.accentLt} border="#BFDBFE"><Paperclip size={9} style={{ marginRight: 3 }} />Adjunto</Chip>}
          </div>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: C.navy, lineHeight: '1.35' }}>
            {task.title}
          </h3>
        </div>
        <button onClick={() => onViewDetail(task)}
          style={{ background: C.bg, border: `1px solid ${C.border}`, cursor: 'pointer', color: C.muted, padding: '5px 10px', borderRadius: '8px', flexShrink: 0, marginLeft: 8, fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 4 }}
          onMouseEnter={e => { e.currentTarget.style.background = C.accentLt; e.currentTarget.style.color = C.navy; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.muted; }}
        >
          Ver <ChevronRight size={11} />
        </button>
      </div>

      {task.description && (
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: C.muted, lineHeight: '1.55',
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
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
        {task.due_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: overdue ? C.danger : C.muted, fontWeight: overdue ? '700' : '400' }}>
            {overdue ? <AlertTriangle size={11} /> : <Calendar size={11} />}
            {overdue ? `Vencido: ${formatDate(task.due_date)}` : `Vence: ${formatDate(task.due_date)}`}
          </div>
        )}
      </div>

      {(isAssigned || isCreator) && task.status !== 'completed' && (
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

      {task.status === 'completed' && task.completed_at && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.success, fontSize: '11px', fontWeight: '600' }}>
          <CheckCircle2 size={13} />
          Completado el {formatDate(task.completed_at)}
        </div>
      )}
    </div>
  );
}

// ─── NEW TASK MODAL ───────────────────────────────────────────────────────────
function NewTaskModal({ profiles, currentUserId, onClose, onCreated, preAssignTo = null }) {
  const [form, setForm] = useState({
    title: '', description: '', assigned_to: preAssignTo || '', priority: 'medium', due_date: ''
  });
  const [file, setFile]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef = useRef();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      const allowed = ['application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'];
      if (!allowed.includes(f.type)) { setError('Solo se permiten archivos PDF, Excel o CSV.'); return; }
      if (f.size > 10 * 1024 * 1024) { setError('El archivo no puede superar 10 MB.'); return; }
      setFile(f); setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('El título es obligatorio.');
    if (!form.assigned_to)  return setError('Debes asignar la tarea a alguien.');
    setLoading(true); setError('');

    let fileUrl = null;
    let fileName = null;

    if (file) {
      const ext = file.name.split('.').pop();
      const path = `tasks/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('task-files').upload(path, file);
      if (upErr) { setLoading(false); return setError('Error subiendo archivo: ' + upErr.message); }
      const { data: urlData } = supabase.storage.from('task-files').getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      fileName = file.name;
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

  const sel = {
    width: '100%', height: '44px', padding: '0 14px',
    borderRadius: '10px', border: `1.5px solid ${C.border}`,
    background: C.surface, color: C.text, fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer', fontFamily: 'inherit',
  };
  const inp = {
    width: '100%', height: '44px', padding: '0 14px',
    borderRadius: '10px', border: `1.5px solid ${C.border}`,
    background: C.surface, color: C.text, fontSize: '14px',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  };
  const lbl = { display: 'block', fontSize: '11px', fontWeight: '700', color: C.navy, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,15,30,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: C.surface, borderRadius: '24px', padding: '0', width: '100%', maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto', border: `1.5px solid ${C.border}`, boxShadow: '0 32px 80px rgba(27,58,107,0.22)' }}>
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`, borderRadius: '22px 22px 0 0', padding: '24px 28px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>Crear Ticket</h2>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Asigna y define los detalles de la tarea</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '28px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={lbl}>Título *</label>
              <input style={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Diseñar pantalla de login" required
                onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = `0 0 0 3px ${C.accentLt}`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={lbl}>Descripción</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Detalla los criterios de aceptación, contexto y resultados esperados..." rows={4}
                style={{ ...inp, height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: '1.6' }}
                onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = `0 0 0 3px ${C.accentLt}`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={lbl}>Asignar a *</label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} required style={sel}>
                <option value="">— Selecciona un miembro —</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name} · {p.cargo}</option>
                ))}
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
                <input type="datetime-local" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={inp}
                  onFocus={e => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = `0 0 0 3px ${C.accentLt}`; }}
                  onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            {/* File upload */}
            <div>
              <label style={lbl}>Adjuntar archivo <span style={{ textTransform: 'none', fontWeight: '400', color: C.muted, letterSpacing: 0 }}>(PDF, Excel, CSV · máx. 10 MB)</span></label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${file ? C.blue : C.border}`, borderRadius: '12px',
                  padding: '20px', textAlign: 'center', cursor: 'pointer',
                  background: file ? C.accentLt : C.bg, transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!file) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentLt; } }}
                onMouseLeave={e => { if (!file) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; } }}
              >
                <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
                {file ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <FileText size={20} color={C.blue} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: C.navy }}>{file.name}</div>
                      <div style={{ fontSize: '11px', color: C.muted }}>{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{ background: C.dangerLt, border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: C.danger, display: 'flex', marginLeft: 8 }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload size={20} color={C.mutedLt} style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: '13px', color: C.muted, fontWeight: '500' }}>Haz clic para subir un archivo</div>
                    <div style={{ fontSize: '11px', color: C.mutedLt, marginTop: 2 }}>PDF, Excel, CSV admitidos</div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: C.dangerLt, border: `1.5px solid #FECACA`, borderRadius: '10px', color: C.danger, fontSize: '12px', fontWeight: '600' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
              <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '20px', border: `1.5px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading} style={{
                padding: '10px 24px', borderRadius: '20px', border: 'none',
                background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
                color: '#fff', fontSize: '13px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1,
                display: 'flex', alignItems: 'center', gap: 7,
                boxShadow: '0 4px 14px rgba(37,99,235,0.30)',
              }}>
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

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, iconColor, iconBg, accent }) {
  return (
    <div style={{
      background: C.surface, border: `1.5px solid ${C.border}`,
      borderRadius: '16px', padding: '20px 20px 18px',
      display: 'flex', alignItems: 'center', gap: '14px',
      boxShadow: '0 1px 4px rgba(27,58,107,0.06)',
      borderTop: `3px solid ${accent}`,
      transition: 'box-shadow 0.2s, transform 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(27,58,107,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(27,58,107,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ width: 46, height: 46, borderRadius: '13px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={iconColor} />
      </div>
      <div>
        <div style={{ fontSize: '28px', fontWeight: '800', color: C.navy, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '12px', color: C.muted, marginTop: 3, fontWeight: '500' }}>{label}</div>
      </div>
    </div>
  );
}

// ─── TEAM MEMBERS VIEW ────────────────────────────────────────────────────────
function TeamView({ profiles, currentUserId, onAssignTask }) {
  const [editingPhoto, setEditingPhoto] = useState(null);
  const fileRef = useRef();

  const handlePhotoUpload = async (profileId, file) => {
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `avatars/${profileId}.${ext}`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { alert('Error subiendo foto: ' + upErr.message); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', profileId);
    setEditingPhoto(null);
    window.location.reload();
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '800', color: C.navy, letterSpacing: '-0.02em' }}>Miembros del equipo</h2>
        <p style={{ margin: 0, fontSize: '13px', color: C.muted }}>{profiles.length} colaboradores activos en el workspace</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {profiles.map(profile => {
          const isMe = profile.id === currentUserId;
          return (
            <div key={profile.id} style={{
              background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: '20px',
              padding: '28px 20px 20px', textAlign: 'center',
              boxShadow: '0 1px 4px rgba(27,58,107,0.06)',
              transition: 'box-shadow 0.2s, transform 0.15s',
              position: 'relative',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(27,58,107,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(27,58,107,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {isMe && (
                <div style={{ position: 'absolute', top: 12, right: 12 }}>
                  <span style={{ fontSize: '9px', fontWeight: '700', background: C.accentLt, color: C.navy, padding: '2px 7px', borderRadius: '10px', letterSpacing: '0.05em' }}>TÚ</span>
                </div>
              )}

              {/* Avatar with photo upload option for self */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
                <Avatar name={profile.full_name} size={72} photoUrl={profile.avatar_url} />
                {isMe && (
                  <button
                    onClick={() => { setEditingPhoto(profile.id); fileRef.current?.click(); }}
                    style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 24, height: 24, borderRadius: '50%',
                      background: C.navy, border: '2px solid #fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Camera size={11} color="#fff" />
                  </button>
                )}
              </div>

              {isMe && (
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => handlePhotoUpload(currentUserId, e.target.files[0])} />
              )}

              <div style={{ fontSize: '15px', fontWeight: '800', color: C.navy, marginBottom: 4, letterSpacing: '-0.01em' }}>
                {profile.full_name}
              </div>
              <div style={{ fontSize: '11px', color: C.muted, marginBottom: 16, padding: '3px 10px', background: C.bg, borderRadius: '20px', display: 'inline-block', border: `1px solid ${C.border}` }}>
                {profile.cargo || 'Colaborador'}
              </div>

              <button
                onClick={() => onAssignTask(profile.id)}
                style={{
                  width: '100%', padding: '8px 0', borderRadius: '12px',
                  border: 'none', background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
                  color: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 3px 10px rgba(37,99,235,0.25)',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <Plus size={13} /> Asignar tarea
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session,       setSession]       = useState(null);
  const [profile,       setProfile]       = useState(null);
  const [profiles,      setProfiles]      = useState([]);
  const [tasks,         setTasks]         = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs,    setShowNotifs]    = useState(false);
  const [showNewTask,   setShowNewTask]   = useState(false);
  const [preAssignTo,   setPreAssignTo]   = useState(null);
  const [activeTab,     setActiveTab]     = useState('all');
  const [authLoading,   setAuthLoading]   = useState(true);
  const [selectedTask,  setSelectedTask]  = useState(null);
  const [logoUrl,       setLogoUrl]       = useState(null);
  const logoFileRef = useRef();

  // Auth form
  const [authMode,     setAuthMode]     = useState('login'); // 'login' | 'signup'
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [cargo,        setCargo]        = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [formLoading,  setFormLoading]  = useState(false);
  const [authError,    setAuthError]    = useState(null);
  const [successMsg,   setSuccessMsg]   = useState(null);
  const [fieldErrors,  setFieldErrors]  = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => { setSession(s); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setAuthLoading(false); });
    // Load saved logo from localStorage
    const saved = localStorage.getItem('hanter_logo');
    if (saved) setLogoUrl(saved);
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadProfile(); loadProfiles(); loadTasks(); loadNotifications();
    const notifSub = supabase.channel('notifs_' + session.user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        payload => setNotifications(prev => [payload.new, ...prev]))
      .subscribe();
    const taskSub = supabase.channel('tasks_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadTasks())
      .subscribe();
    return () => { supabase.removeChannel(notifSub); supabase.removeChannel(taskSub); };
  }, [session]);

  const loadProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) setProfile(data);
  };
  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) setProfiles(data);
  };
  const loadTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data);
  };
  const loadNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*')
      .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(25);
    if (data) setNotifications(data);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const upd = { status: newStatus };
    if (newStatus === 'completed') upd.completed_at = new Date().toISOString();
    await supabase.from('tasks').update(upd).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...upd } : t));
  };
  const handleDelete = async (taskId) => {
    if (!window.confirm('¿Eliminar este ticket?')) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };
  const markNotifsRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleLogoUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setLogoUrl(ev.target.result); localStorage.setItem('hanter_logo', ev.target.result); };
    reader.readAsDataURL(f);
  };

  // Auth
  const validate = () => {
    const e = {};
    if (authMode === 'signup') {
      if (!firstName.trim()) e.firstName = 'Ingresa tu nombre';
      if (!lastName.trim())  e.lastName  = 'Ingresa tu apellido';
      if (!cargo.trim())     e.cargo     = 'Ingresa tu cargo';
    }
    if (!email.trim())       e.email    = 'El correo es obligatorio';
    if (password.length < 6) e.password = 'Mínimo 6 caracteres';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setFormLoading(true); setAuthError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setAuthError('Correo o contraseña incorrectos.');
    setFormLoading(false);
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setFormLoading(true); setAuthError(null); setSuccessMsg(null);
    const { data, error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { first_name: firstName.trim(), last_name: lastName.trim(), cargo: cargo.trim(), full_name: `${firstName.trim()} ${lastName.trim()}` } },
    });
    if (err) { setAuthError(err.message); setFormLoading(false); return; }
    // Always show success and redirect to login
    setAuthMode('login');
    setPassword('');
    setFirstName(''); setLastName(''); setCargo('');
    setFieldErrors({});
    setSuccessMsg('¡Cuenta creada con éxito! Ingresa con tu correo y contraseña.');
    setFormLoading(false);
  };

  const resetForm = () => {
    setFirstName(''); setLastName(''); setCargo('');
    setEmail(''); setPassword('');
    setFieldErrors({}); setAuthError(null); setSuccessMsg(null);
  };

  // Derived
  const myPending    = tasks.filter(t => t.assigned_to === session?.user.id && t.status !== 'completed').length;
  const myCompleted  = tasks.filter(t => t.assigned_to === session?.user.id && t.status === 'completed').length;
  const overdueCount = tasks.filter(t => isOverdue(t.due_date, t.status) && (t.assigned_to === session?.user.id || t.created_by === session?.user.id)).length;
  const unread = notifications.filter(n => !n.read).length;

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'assigned')  return t.assigned_to === session?.user.id && t.status !== 'completed';
    if (activeTab === 'created')   return t.created_by  === session?.user.id;
    if (activeTab === 'completed') return t.status === 'completed';
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
    const isTeamView = activeTab === 'team';

    const tabBtn = (tab, label, icon) => (
      <button key={tab} onClick={() => setActiveTab(tab)}
        style={{
          padding: '7px 14px', borderRadius: '8px', border: 'none',
          background: activeTab === tab ? C.navy : 'transparent',
          color: activeTab === tab ? '#fff' : C.muted,
          fontWeight: '600', fontSize: '12px', cursor: 'pointer',
          transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
        }}
        onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.background = C.accentLt; }}
        onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.background = 'transparent'; }}
      >
        {icon && React.createElement(icon, { size: 13 })}
        {label}
      </button>
    );

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
        <header style={{
          width: '100%', height: '64px', background: C.surface,
          borderBottom: `1.5px solid ${C.border}`,
          padding: '0 28px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 2px 12px rgba(27,58,107,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Logo — click to change */}
            <div
              onClick={() => logoFileRef.current?.click()}
              style={{ cursor: 'pointer', position: 'relative' }}
              title="Haz clic para cambiar el logo"
            >
              {logoUrl
                ? <img src={logoUrl} alt="Logo" style={{ width: 36, height: 36, borderRadius: '10px', objectFit: 'cover', border: `1.5px solid ${C.border}` }} />
                : (
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <Zap size={18} color="#fff" />
                    <div style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: C.blue, border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={7} color="#fff" />
                    </div>
                  </div>
                )
              }
            </div>
            <input ref={logoFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            <div>
              <span style={{ fontWeight: '800', fontSize: '15px', color: C.navy, letterSpacing: '-0.02em' }}>Hanter</span>
              <span style={{ fontWeight: '400', fontSize: '15px', color: C.accent, marginLeft: 4 }}>Workspace</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifs(v => !v); if (!showNotifs) markNotifsRead(); }}
                style={{ position: 'relative', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: '10px', padding: '7px', cursor: 'pointer', color: C.navy, display: 'flex', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <Bell size={17} />
                {unread > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, background: C.danger, color: '#fff', borderRadius: '50%', width: 17, height: 17, fontSize: '9px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
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

            {/* User pill — no email */}
            {profile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px 5px 5px', borderRadius: '100px', border: `1.5px solid ${C.border}`, background: C.bg }}>
                <Avatar name={profile.full_name} size={30} photoUrl={profile.avatar_url} />
                <div style={{ lineHeight: '1.2' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: C.navy }}>{profile.full_name}</div>
                  <div style={{ fontSize: '10px', color: C.muted }}>{profile.cargo}</div>
                </div>
              </div>
            )}

            <button
              onClick={() => supabase.auth.signOut()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', background: C.bg, border: `1.5px solid ${C.border}`, color: C.muted, padding: '7px 14px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.dangerLt; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = C.danger; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
            >
              <LogOut size={13} /> Salir
            </button>
          </div>
        </header>

        {/* MAIN */}
        <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '36px 28px', animation: 'fadeUp 0.4s ease-out' }}>
          {/* Page header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 4, height: 28, borderRadius: '4px', background: `linear-gradient(to bottom, ${C.blue}, ${C.accent})` }} />
                <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '900', color: C.navy, letterSpacing: '-0.025em' }}>
                  Bienvenido, {profile?.full_name?.split(' ')[0] ?? 'Usuario'}
                </h1>
              </div>
              <p style={{ margin: 0, color: C.muted, fontSize: '13px', fontWeight: '500', paddingLeft: 14 }}>
                {profile?.cargo}
              </p>
            </div>
            <button
              onClick={() => { setPreAssignTo(null); setShowNewTask(true); }}
              style={{
                padding: '10px 22px', background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
                color: '#fff', border: 'none', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(37,99,235,0.30)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <Plus size={16} /> Nueva Tarea
            </button>
          </div>

          {/* Stats */}
          {!isTeamView && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
              <StatCard icon={Clock}        label="Mis Pendientes" value={myPending}    iconColor={C.accent}  iconBg={C.accentLt}  accent={C.accent} />
              <StatCard icon={CheckCircle2} label="Completadas"    value={myCompleted}  iconColor={C.success} iconBg={C.successLt} accent={C.success} />
              <StatCard icon={AlertCircle}  label="Vencidas"       value={overdueCount} iconColor={C.danger}  iconBg={C.dangerLt}  accent={C.danger} />
            </div>
          )}

          {/* Tabs */}
          <div style={{ background: C.surface, borderRadius: '12px', padding: '5px', display: 'inline-flex', gap: 3, marginBottom: 28, border: `1.5px solid ${C.border}`, boxShadow: '0 1px 4px rgba(27,58,107,0.06)' }}>
            {tabBtn('all',       'Todas',         LayoutDashboard)}
            {tabBtn('assigned',  'Asignadas a mí', CheckSquare)}
            {tabBtn('created',   'Creadas por mí', Briefcase)}
            {tabBtn('completed', 'Completadas',    CheckCircle2)}
            {tabBtn('team',      'Equipo',         Users)}
          </div>

          {/* Team view */}
          {isTeamView ? (
            <TeamView
              profiles={profiles}
              currentUserId={session.user.id}
              onAssignTask={(profileId) => { setPreAssignTo(profileId); setShowNewTask(true); }}
            />
          ) : activeTab !== 'completed' ? (
            /* Kanban */
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
          ) : (
            <div style={{ maxWidth: '720px' }}>
              {filteredTasks.length === 0
                ? <div style={{ border: `2px dashed ${C.border}`, borderRadius: '14px', padding: '48px', textAlign: 'center', color: C.mutedLt }}>Sin tareas completadas</div>
                : filteredTasks.map(task => (
                  <TicketCard key={task.id} task={task} currentUserId={session.user.id}
                    profiles={profiles} onStatusChange={handleStatusChange}
                    onDelete={handleDelete} onViewDetail={setSelectedTask} />
                ))
              }
            </div>
          )}
        </main>

        {showNewTask && (
          <NewTaskModal
            profiles={profiles} currentUserId={session.user.id}
            preAssignTo={preAssignTo}
            onClose={() => { setShowNewTask(false); setPreAssignTo(null); }}
            onCreated={t => setTasks(prev => [t, ...prev])}
          />
        )}
        {selectedTask && (
          <TaskDetailModal
            task={selectedTask} profiles={profiles} currentUserId={session.user.id}
            onClose={() => setSelectedTask(null)}
            onStatusChange={handleStatusChange} onDelete={handleDelete}
          />
        )}
        {showNotifs && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowNotifs(false)} />}
      </div>
    );
  }

  // =========================================================================
  // AUTH PAGE — estilo oscuro como imagen 1
  // =========================================================================
  const darkInp = {
    width: '100%', height: '46px', padding: '0 16px',
    borderRadius: '10px', border: `1.5px solid ${C.darkBorder}`,
    background: 'rgba(255,255,255,0.07)', color: '#fff',
    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Sora', sans-serif", transition: 'border-color 0.15s, box-shadow 0.15s',
  };
  const darkLbl = { display: 'block', fontSize: '11px', fontWeight: '600', color: '#9CA3AF', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' };
  const errBorder = { borderColor: '#EF4444' };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      position: 'relative', overflow: 'hidden',
      background: C.darkBg,
      backgroundImage: `url(${BG_IMAGE})`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      fontFamily: "'Sora', 'Plus Jakarta Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box} body{margin:0}
        .dark-input::placeholder{color:#6B7280}
        .dark-input:focus{border-color:${C.accent}!important;box-shadow:0 0 0 3px rgba(91,155,213,0.15)!important;background:rgba(255,255,255,0.10)!important}
        .auth-tab{transition:all 0.2s}
      `}</style>

      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(5,8,20,0.88) 0%, rgba(10,20,45,0.80) 100%)', backdropFilter: 'blur(2px)' }} />

      <div style={{
        position: 'relative', zIndex: 10, width: '100%',
        display: 'flex', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', padding: '40px 64px',
        maxWidth: '1200px', margin: '0 auto',
        gap: '64px',
      }}>
        {/* Left copy */}
        <div style={{ flex: 1, color: '#fff', maxWidth: '480px', animation: 'fadeUp 0.5s ease-out' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(91,155,213,0.15)', border: '1px solid rgba(91,155,213,0.3)', borderRadius: '100px', padding: '5px 14px', marginBottom: 24 }}>
            <Zap size={12} color={C.accent} />
            <span style={{ fontSize: '11px', fontWeight: '700', color: C.accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Bienvenido a</span>
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: '64px', fontWeight: '900', lineHeight: '1', letterSpacing: '-0.04em', color: '#fff' }}>
            Hanter
          </h1>
          <h1 style={{ margin: '0 0 24px', fontSize: '64px', fontWeight: '900', lineHeight: '1', letterSpacing: '-0.04em', color: C.accent }}>
            Workspace
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: 'rgba(255,255,255,0.55)', fontWeight: '300', lineHeight: '1.80', maxWidth: '380px' }}>
            Gestiona tus tareas, haz seguimiento en tiempo real y colabora con tu equipo con total autonomía. Sin microgestión ni complicaciones.
          </p>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Tablero Kanban en tiempo real', 'Notificaciones automáticas', 'Control por prioridad y fecha límite'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(91,155,213,0.15)', border: '1px solid rgba(91,155,213,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={11} color={C.accent} />
                </div>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: '400' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auth card */}
        <div style={{
          width: '100%', maxWidth: '420px',
          background: 'rgba(17,24,39,0.85)',
          backdropFilter: 'blur(24px)',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          animation: 'fadeUp 0.5s ease-out 0.1s both',
        }}>
          {/* Tabs at top */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {[['login', 'Ingresar'], ['signup', 'Crear cuenta']].map(([mode, label]) => (
              <button key={mode} className="auth-tab"
                onClick={() => { setAuthMode(mode); resetForm(); }}
                style={{
                  flex: 1, padding: '18px 0', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: authMode === mode ? 'rgba(91,155,213,0.1)' : 'transparent',
                  color: authMode === mode ? C.accent : '#6B7280',
                  fontSize: '13px', fontWeight: '700', letterSpacing: '0.02em',
                  borderBottom: authMode === mode ? `2px solid ${C.accent}` : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: '28px' }}>
            {/* Alerts */}
            {authError && (
              <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '10px', color: '#FCA5A5', fontSize: '12px', marginBottom: 16, fontWeight: '600' }}>
                {authError}
              </div>
            )}
            {successMsg && (
              <div style={{ padding: '10px 14px', background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: '10px', color: '#86EFAC', fontSize: '12px', marginBottom: 16, fontWeight: '600' }}>
                {successMsg}
              </div>
            )}
            <form onSubmit={authMode === 'signup' ? handleSignUp : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {authMode === 'signup' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={darkLbl}>Nombres *</label>
                      <input className="dark-input" style={{ ...darkInp, ...(fieldErrors.firstName ? errBorder : {}) }}
                        placeholder="Juan" value={firstName}
                        onChange={e => { setFirstName(e.target.value); setFieldErrors(x => ({ ...x, firstName: undefined })); }} required />
                      {fieldErrors.firstName && <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#FCA5A5' }}>{fieldErrors.firstName}</p>}
                    </div>
                    <div>
                      <label style={darkLbl}>Apellidos *</label>
                      <input className="dark-input" style={{ ...darkInp, ...(fieldErrors.lastName ? errBorder : {}) }}
                        placeholder="Pérez" value={lastName}
                        onChange={e => { setLastName(e.target.value); setFieldErrors(x => ({ ...x, lastName: undefined })); }} required />
                      {fieldErrors.lastName && <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#FCA5A5' }}>{fieldErrors.lastName}</p>}
                    </div>
                  </div>
                  <div>
                    <label style={darkLbl}>Cargo *</label>
                    <input list="cargo-opts" className="dark-input" style={{ ...darkInp, ...(fieldErrors.cargo ? errBorder : {}) }}
                      placeholder="Escribe o selecciona tu cargo..." value={cargo}
                      onChange={e => { setCargo(e.target.value); setFieldErrors(x => ({ ...x, cargo: undefined })); }} required />
                    <datalist id="cargo-opts">{CARGO_OPTIONS.map(c => <option key={c} value={c} />)}</datalist>
                    {fieldErrors.cargo && <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#FCA5A5' }}>{fieldErrors.cargo}</p>}
                  </div>
                </>
              )}

              <div>
                <label style={darkLbl}>Correo electrónico</label>
                <input className="dark-input" style={{ ...darkInp, ...(fieldErrors.email ? errBorder : {}) }}
                  type="email" placeholder="correo@empresa.com"
                  value={email} onChange={e => { setEmail(e.target.value); setFieldErrors(x => ({ ...x, email: undefined })); }} required />
                {fieldErrors.email && <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#FCA5A5' }}>{fieldErrors.email}</p>}
              </div>

              <div>
                <label style={darkLbl}>Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input className="dark-input"
                    style={{ ...darkInp, paddingRight: 44, ...(fieldErrors.password ? errBorder : {}) }}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••" value={password}
                    onChange={e => { setPassword(e.target.value); setFieldErrors(x => ({ ...x, password: undefined })); }} required />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password && <p style={{ margin: '3px 0 0', fontSize: '10px', color: '#FCA5A5' }}>{fieldErrors.password}</p>}
              </div>

              <button type="submit" disabled={formLoading}
                style={{
                  width: '100%', height: '48px',
                  background: authMode === 'signup'
                    ? `linear-gradient(135deg, ${C.blue} 0%, ${C.accent} 100%)`
                    : `linear-gradient(135deg, ${C.blue} 0%, ${C.navy} 100%)`,
                  color: '#fff', border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: '700', cursor: formLoading ? 'not-allowed' : 'pointer',
                  marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  opacity: formLoading ? 0.75 : 1, transition: 'all 0.15s',
                  boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
                  fontFamily: 'inherit',
                }}
              >
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
