import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

const PALETTE = [
  'bg-violet-500/20 text-violet-300',
  'bg-blue-500/20   text-blue-300',
  'bg-emerald-500/20 text-emerald-300',
  'bg-rose-500/20   text-rose-300',
  'bg-amber-500/20  text-amber-300',
  'bg-pink-500/20   text-pink-300',
]

function colorFor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function Avatar({ name = '', src, size = 'md', className }) {
  const sizes = { sm: 'h-6 w-6 text-[10px]', md: 'h-7 w-7 text-xs', lg: 'h-9 w-9 text-sm' }
  return (
    <span className={cn(
      'inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0',
      sizes[size],
      src ? '' : colorFor(name),
      className,
    )}>
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover rounded-full" />
        : getInitials(name) || '?'
      }
    </span>
  )
}
