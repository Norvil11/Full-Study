import { useState, useRef } from 'react'
import { Plus, GripVertical, Calendar, User2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { COLUMNS, PRIORITY_CONFIG } from '@/lib/mockData'
import { Badge } from './ui/Badge'
import { Avatar } from './ui/Avatar'
import { Button } from './ui/Button'

export function KanbanBoard({ tasks, users, onAddTask, onUpdateTask }) {
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)
  const dragTask = tasks.find((t) => t.id === dragId)

  function userById(id) {
    return users.find((u) => u.id === id)
  }

  function handleDragStart(e, id) {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, colId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverCol(colId)
  }

  function handleDrop(colId) {
    if (dragId && dragTask?.status !== colId) {
      onUpdateTask(dragId, { status: colId })
    }
    setDragId(null)
    setOverCol(null)
  }

  function handleDragEnd() {
    setDragId(null)
    setOverCol(null)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 h-full">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id)
        const isOver = overCol === col.id && dragTask?.status !== col.id
        return (
          <div
            key={col.id}
            className={cn(
              'flex flex-col rounded-xl border border-border bg-[#0b0f16] w-[270px] flex-shrink-0 transition-all duration-150',
              isOver && 'kanban-col-over border-white/20',
            )}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDrop={() => handleDrop(col.id)}
            onDragLeave={() => setOverCol(null)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3.5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className={cn('h-1.5 w-1.5 rounded-full', col.dot)} />
                <span className={cn('text-xs font-semibold', col.color)}>{col.label}</span>
                <span className="text-[10px] font-mono text-zinc-600 bg-white/5 rounded px-1.5 py-0.5">
                  {colTasks.length}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onAddTask(col.id)}
              >
                <Plus size={12} />
              </Button>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[80px]">
              {colTasks.map((task, idx) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  user={userById(task.assignee_id)}
                  isDragging={dragId === task.id}
                  idx={idx}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                />
              ))}
              {colTasks.length === 0 && (
                <div className="flex items-center justify-center h-16 text-xs text-zinc-700 rounded-lg border border-dashed border-zinc-800">
                  Soltar aquí
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskCard({ task, user, isDragging, onDragStart, onDragEnd, idx }) {
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'task-card group rounded-lg border border-border bg-[#0e1117] p-3 space-y-2.5 animate-fade-in',
        'hover:border-white/10 hover:bg-[#111520] transition-all duration-150',
        isDragging && 'opacity-30 scale-95',
      )}
      style={{ animationDelay: `${idx * 40}ms` }}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <GripVertical size={12} className="text-zinc-700 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <p className="text-sm text-zinc-200 font-medium leading-snug flex-1">{task.title}</p>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2 pl-4">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 pl-4">
          {task.tags.map((tag) => (
            <Badge key={tag} className="text-zinc-500 bg-white/5 border-white/5">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pl-4">
        <Badge className={p.class}>{p.label}</Badge>
        <div className="flex items-center gap-2">
          {task.due_date && (
            <div className="flex items-center gap-1 text-[10px] text-zinc-600">
              <Calendar size={9} />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
          {user ? (
            <Avatar name={user.full_name || user.email} size="sm" />
          ) : (
            <span className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center">
              <User2 size={10} className="text-zinc-600" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
