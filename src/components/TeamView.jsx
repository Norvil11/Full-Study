import { Avatar } from './ui/Avatar'
import { Badge } from './ui/Badge'
import { PRIORITY_CONFIG } from '@/lib/mockData'

export function TeamView({ users, tasks }) {
  return (
    <div className="space-y-3 animate-fade-in">
      <h2 className="text-sm font-semibold text-zinc-300">Equipo & carga de trabajo</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {users.map((user) => {
          const userTasks = tasks.filter((t) => t.assignee_id === user.id)
          const done = userTasks.filter((t) => t.status === 'done').length
          const pct = userTasks.length ? Math.round((done / userTasks.length) * 100) : 0
          return (
            <div key={user.id} className="rounded-xl border border-border bg-[#0b0f16] p-4 space-y-3 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar name={user.full_name || user.email} size="lg" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.full_name || '—'}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
                </div>
                <span className="ml-auto text-xs font-mono text-zinc-500 bg-white/5 border border-border rounded px-2 py-0.5">
                  {userTasks.length} tarea{userTasks.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span>Completadas</span>
                  <span>{done}/{userTasks.length}</span>
                </div>
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Active tasks */}
              <div className="space-y-1.5">
                {userTasks.filter((t) => t.status !== 'done').slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="h-1 w-1 rounded-full bg-zinc-600 shrink-0" />
                    <span className="truncate flex-1">{t.title}</span>
                    <Badge className={PRIORITY_CONFIG[t.priority]?.class || ''}>{PRIORITY_CONFIG[t.priority]?.label}</Badge>
                  </div>
                ))}
                {userTasks.filter((t) => t.status !== 'done').length === 0 && (
                  <p className="text-[11px] text-zinc-700">Sin tareas activas</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
