import { cn } from '@/lib/utils'

export function Badge({ children, className }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border tracking-wide',
      className,
    )}>
      {children}
    </span>
  )
}
