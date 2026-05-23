import { useState } from 'react'
import {
  LayoutDashboard, CheckSquare, FolderKanban, Users,
  Settings, ChevronRight, Zap, Bell, Search, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from './ui/Avatar'
import { signOut } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const NAV = [
  { id: 'dashboard', label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'tasks',     label: 'Mis Tareas',  icon: CheckSquare },
  { id: 'projects',  label: 'Proyectos',   icon: FolderKanban },
  { id: 'team',      label: 'Equipo',      icon: Users },
]

export function Sidebar({ active, onChange }) {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const displayEmail = user?.email || 'donan.chavez@utec.edu.pe'

  async function handleSignOut() {
    await signOut()
  }

  return (
    <aside className={cn(
      'flex flex-col bg-[#080c10] border-r border-border transition-all duration-300 ease-in-out relative',
      collapsed ? 'w-[60px]' : 'w-[220px]',
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-2.5 px-4 py-5 border-b border-border shrink-0',
        collapsed && 'px-3 justify-center',
      )}>
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <Zap size={14} className="text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm text-white tracking-tight truncate">
            Hanter<span className="text-indigo-400">.</span>
          </span>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-border">
          <button className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors group">
            <Search size={12} className="text-zinc-500 group-hover:text-zinc-400" />
            <span className="text-xs text-zinc-500 group-hover:text-zinc-400">Buscar...</span>
            <span className="ml-auto text-[10px] font-mono text-zinc-600 border border-zinc-700 rounded px-1">⌘K</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150',
              collapsed && 'justify-center px-0',
              active === id
                ? 'bg-white/10 text-white'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5',
            )}
          >
            <Icon size={15} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
            {!collapsed && active === id && <ChevronRight size={12} className="ml-auto text-zinc-500" />}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-2 py-3 space-y-0.5">
        <button className={cn(
          'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all',
          collapsed && 'justify-center',
        )}>
          <Bell size={15} className="shrink-0" />
          {!collapsed && <span>Notificaciones</span>}
        </button>
        <button className={cn(
          'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all',
          collapsed && 'justify-center',
        )}>
          <Settings size={15} className="shrink-0" />
          {!collapsed && <span>Configuración</span>}
        </button>
        <button
          onClick={handleSignOut}
          className={cn(
            'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all',
            collapsed && 'justify-center',
          )}
        >
          <LogOut size={15} className="shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>

        {/* Current user */}
        <div className={cn(
          'flex items-center gap-2.5 px-2.5 py-2 mt-1 rounded-md hover:bg-white/5 cursor-pointer transition-all',
          collapsed && 'justify-center',
        )}>
          <Avatar name={displayName} size="sm" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-zinc-300 truncate">{displayName}</span>
              <span className="text-[10px] text-zinc-600 truncate">{displayEmail}</span>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] z-10 h-6 w-6 rounded-full bg-[#0e1117] border border-border hover:bg-muted flex items-center justify-center shadow-sm transition-colors"
      >
        <ChevronRight size={11} className={cn('text-zinc-500 transition-transform', collapsed && 'rotate-180')} />
      </button>
    </aside>
  )
}
