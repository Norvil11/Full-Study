import { cn } from '@/lib/utils'

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'flex h-9 w-full rounded-lg border border-border bg-white/5 px-3 py-1',
        'text-sm text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-1 focus:ring-ring focus:border-white/20',
        'transition-colors duration-150',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-lg border border-border bg-white/5 px-3 py-2',
        'text-sm text-foreground placeholder:text-muted-foreground resize-none',
        'focus:outline-none focus:ring-1 focus:ring-ring focus:border-white/20',
        'transition-colors duration-150',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'flex h-9 w-full rounded-lg border border-border bg-[#0e1117] px-3 py-1',
        'text-sm text-foreground',
        'focus:outline-none focus:ring-1 focus:ring-ring focus:border-white/20',
        'transition-colors duration-150 cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
