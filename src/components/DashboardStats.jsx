import { TrendingUp, CheckCircle2, Clock3, Flame, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATS = [
  {
    label: 'Tareas Completadas',
    value: '24',
    delta: '+8 esta semana',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    trend: 'up',
  },
  {
    label: 'En Progreso',
    value: '7',
    delta: '3 con prioridad alta',
    icon: Flame,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    trend: 'neutral',
  },
  {
    label: 'Pendientes',
    value: '12',
    delta: '−2 desde ayer',
    icon: Clock3,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    trend: 'down',
  },
  {
    label: 'Eficiencia',
    value: '91%',
    delta: '+4% vs. mes anterior',
    icon: TrendingUp,
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    trend: 'up',
  },
]

export function DashboardStats() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {STATS.map((s, i) => (
        <StatCard key={s.label} stat={s} delay={i * 60} />
      ))}
    </div>
  )
}

function StatCard({ stat, delay }) {
  const Icon = stat.icon
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-[#0b0f16] p-4 animate-fade-in hover:border-white/10 transition-colors group"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle grid texture */}
      <div className="absolute inset-0 opacity-[0.02]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs text-zinc-500 font-medium">{stat.label}</span>
          <div className={cn('p-1.5 rounded-lg', stat.bg)}>
            <Icon size={13} className={stat.color} />
          </div>
        </div>

        <div className="flex items-end justify-between">
          <span className="text-2xl font-semibold text-white tracking-tight">{stat.value}</span>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 pb-0.5">
            {stat.trend === 'up' && <ArrowUpRight size={10} className="text-emerald-400" />}
            <span>{stat.delta}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
