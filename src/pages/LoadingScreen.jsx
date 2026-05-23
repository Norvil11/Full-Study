import { Zap } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050709]">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-1 ring-white/10">
          <Zap size={22} className="text-white" />
        </div>
        <div className="flex gap-1">
          {[0,1,2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-indigo-400/50 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
