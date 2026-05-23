import { useState, useEffect } from 'react'
import { X, User2, Calendar, AlertCircle, Tag } from 'lucide-react'
import { Button } from './ui/Button'
import { Input, Textarea, Select } from './ui/Input'
import { Avatar } from './ui/Avatar'
import { cn } from '@/lib/utils'

export function TaskModal({ open, onClose, onSubmit, users, defaultStatus = 'todo' }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignee_id: '',
    priority: 'medium',
    due_date: '',
    status: defaultStatus,
    tags: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (open) setForm((f) => ({ ...f, status: defaultStatus }))
  }, [open, defaultStatus])

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.title.trim()) e.title = 'El título es obligatorio'
    if (!form.assignee_id) e.assignee_id = 'Selecciona un responsable'
    if (!form.due_date) e.due_date = 'Indica una fecha límite'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean)
    onSubmit({ ...form, tags, id: 't' + Date.now() })
    setForm({ title: '', description: '', assignee_id: '', priority: 'medium', due_date: '', status: defaultStatus, tags: '' })
    onClose()
  }

  if (!open) return null

  const selectedUser = users.find((u) => u.id === form.assignee_id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#0e1117] border border-border rounded-2xl shadow-2xl shadow-black/50 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-white">Nueva tarea</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <Field label="Título" error={errors.title} required>
            <Input
              placeholder="¿Qué hay que hacer?"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className={errors.title && 'border-rose-500/50'}
              autoFocus
            />
          </Field>

          {/* Description */}
          <Field label="Descripción">
            <Textarea
              placeholder="Contexto adicional, criterios de aceptación..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>

          {/* Row: Assignee + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Responsable" error={errors.assignee_id} required>
              <Select
                value={form.assignee_id}
                onChange={(e) => set('assignee_id', e.target.value)}
                className={errors.assignee_id && 'border-rose-500/50'}
              >
                <option value="">— Seleccionar —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </Select>
            </Field>

            <Field label="Prioridad">
              <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </Select>
            </Field>
          </div>

          {/* Row: Due date + Status */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha límite" error={errors.due_date} required>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => set('due_date', e.target.value)}
                className={cn('cursor-pointer', errors.due_date && 'border-rose-500/50')}
              />
            </Field>

            <Field label="Estado">
              <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="todo">Por Hacer</option>
                <option value="in_progress">En Progreso</option>
                <option value="review">Revisión</option>
                <option value="done">Completado</option>
              </Select>
            </Field>
          </div>

          {/* Tags */}
          <Field label="Etiquetas" hint="Separadas por coma">
            <div className="relative">
              <Tag size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <Input
                placeholder="Frontend, Backend, UX..."
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                className="pl-8"
              />
            </div>
          </Field>

          {/* Assignee preview */}
          {selectedUser && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/5 border border-border">
              <Avatar name={selectedUser.full_name || selectedUser.email} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-300 truncate">{selectedUser.full_name || 'Sin nombre'}</p>
                <p className="text-[10px] text-zinc-500 truncate">{selectedUser.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit}>
            Crear tarea
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, error, hint, required }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1 text-xs font-medium text-zinc-400">
        {label}
        {required && <span className="text-rose-400">*</span>}
        {hint && <span className="text-zinc-600 font-normal ml-1">({hint})</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[10px] text-rose-400">
          <AlertCircle size={9} />
          {error}
        </p>
      )}
    </div>
  )
}
