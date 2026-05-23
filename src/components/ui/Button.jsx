import { cn } from '@/lib/utils'

const variants = {
  default:   'bg-white text-zinc-900 hover:bg-white/90 shadow-sm',
  ghost:     'hover:bg-white/5 text-zinc-400 hover:text-zinc-100',
  outline:   'border border-border bg-transparent hover:bg-white/5 text-zinc-300',
  danger:    'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20',
  primary:   'bg-indigo-500 text-white hover:bg-indigo-400 shadow-sm shadow-indigo-500/20',
}

const sizes = {
  sm:  'h-7 px-3 text-xs rounded-md gap-1.5',
  md:  'h-8 px-4 text-sm rounded-lg gap-2',
  lg:  'h-10 px-5 text-sm rounded-lg gap-2',
  icon:'h-8 w-8 rounded-lg',
}

export function Button({
  children,
  variant = 'default',
  size = 'md',
  className,
  disabled,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
