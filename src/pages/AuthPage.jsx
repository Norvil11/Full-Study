import { useState } from 'react'
import { Zap, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, Mail, Lock, User } from 'lucide-react'
import { signIn, signUp, resetPassword } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ── Tiny ui primitives ────────────────────────────────────────────────────────

function Field({ label, icon: Icon, type = 'text', value, onChange, error, placeholder, show, onToggleShow }) {
  const isPassword = type === 'password' || show !== undefined
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-400">{label}</label>
      <div className="relative group">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <Icon size={14} className={cn('transition-colors', error ? 'text-rose-400' : 'text-zinc-600 group-focus-within:text-indigo-400')} />
        </div>
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={isPassword ? 'current-password' : type === 'email' ? 'email' : 'name'}
          className={cn(
            'h-11 w-full rounded-xl border bg-white/[0.03] pl-10 pr-10 text-sm text-white placeholder:text-zinc-700',
            'focus:outline-none focus:ring-1 transition-all duration-200',
            error
              ? 'border-rose-500/50 focus:ring-rose-500/30'
              : 'border-white/8 focus:border-indigo-500/40 focus:ring-indigo-500/20',
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
    </div>
  )
}

// ── Decorative background ────────────────────────────────────────────────────

function Background() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Deep base */}
      <div className="absolute inset-0 bg-[#050709]" />
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      {/* Glow orbs */}
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[600px] rounded-full bg-indigo-500/5 blur-[80px]" />
      {/* Decorative dots */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-indigo-400/30"
          style={{
            top: `${15 + i * 14}%`,
            left: `${8 + i * 13}%`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  )
}

// ── Auth page ────────────────────────────────────────────────────────────────

export function AuthPage() {
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [globalError, setGlobalError] = useState(null)

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
    setErrors((e) => ({ ...e, [key]: undefined }))
    setGlobalError(null)
  }

  function validate() {
    const e = {}
    if (mode === 'register' && !form.name.trim()) e.name = 'Ingresa tu nombre completo'
    if (!form.email.trim()) e.email = 'El correo es obligatorio'
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) e.email = 'Correo no válido'
    if (mode !== 'reset') {
      if (!form.password) e.password = 'La contraseña es obligatoria'
      else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    }
    if (mode === 'register' && form.password !== form.confirm) e.confirm = 'Las contraseñas no coinciden'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setGlobalError(null)
    try {
      if (mode === 'login') {
        await signIn(form.email, form.password)
        // AuthContext detectará el cambio de sesión automáticamente
      } else if (mode === 'register') {
        await signUp(form.email, form.password, form.name)
        setSuccess('¡Cuenta creada! Revisa tu correo para confirmar tu registro.')
      } else {
        await resetPassword(form.email)
        setSuccess('Te enviamos un enlace para restablecer tu contraseña.')
      }
    } catch (err) {
      const msg = err.message || 'Error desconocido'
      if (msg.includes('Invalid login')) setGlobalError('Correo o contraseña incorrectos.')
      else if (msg.includes('already registered')) setGlobalError('Este correo ya está registrado.')
      else if (msg.includes('placeholder')) setGlobalError('Configura tus credenciales de Supabase en el archivo .env para activar la autenticación real.')
      else setGlobalError(msg)
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    setErrors({})
    setGlobalError(null)
    setSuccess(null)
    setForm({ name: '', email: '', password: '', confirm: '' })
  }

  const titles = {
    login: { heading: 'Bienvenido de vuelta', sub: 'Inicia sesión en tu workspace' },
    register: { heading: 'Crear cuenta', sub: 'Únete a Hanter Workspace' },
    reset: { heading: 'Restablecer contraseña', sub: 'Te enviamos un enlace a tu correo' },
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 font-sans">
      <Background />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-fade-in">
          <div className="mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-1 ring-white/10">
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Hanter<span className="text-indigo-400">.</span>
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5 tracking-wide">WORKSPACE</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-6 shadow-2xl shadow-black/40 animate-fade-in" style={{ animationDelay: '80ms' }}>
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white">{titles[mode].heading}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{titles[mode].sub}</p>
          </div>

          {/* Success state */}
          {success ? (
            <div className="flex flex-col items-center text-center py-6 gap-3 animate-fade-in">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 size={22} className="text-emerald-400" />
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{success}</p>
              <button
                onClick={() => switchMode('login')}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors mt-2"
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field — register only */}
              {mode === 'register' && (
                <div className="animate-fade-in">
                  <Field
                    label="Nombre completo"
                    icon={User}
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Donan Chavez"
                    error={errors.name}
                  />
                </div>
              )}

              {/* Email */}
              <Field
                label="Correo electrónico"
                icon={Mail}
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="donan.chavez@utec.edu.pe"
                error={errors.email}
              />

              {/* Password */}
              {mode !== 'reset' && (
                <Field
                  label="Contraseña"
                  icon={Lock}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="••••••••"
                  error={errors.password}
                  show={showPass}
                  onToggleShow={() => setShowPass(!showPass)}
                />
              )}

              {/* Confirm password — register only */}
              {mode === 'register' && (
                <div className="animate-fade-in">
                  <Field
                    label="Confirmar contraseña"
                    icon={Lock}
                    value={form.confirm}
                    onChange={(e) => set('confirm', e.target.value)}
                    placeholder="••••••••"
                    error={errors.confirm}
                    show={showConfirm}
                    onToggleShow={() => setShowConfirm(!showConfirm)}
                  />
                </div>
              )}

              {/* Forgot password link */}
              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-[11px] text-zinc-500 hover:text-indigo-400 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {/* Global error */}
              {globalError && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/8 px-3 py-2.5 animate-fade-in">
                  <p className="text-[11px] text-rose-300 leading-relaxed">{globalError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'relative w-full h-11 rounded-xl font-medium text-sm transition-all duration-200',
                  'bg-gradient-to-r from-indigo-500 to-violet-500 text-white',
                  'hover:from-indigo-400 hover:to-violet-400',
                  'shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center justify-center gap-2',
                )}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login' ? 'Iniciar sesión' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}
                    </span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Switch mode */}
        {!success && (
          <p className="text-center text-xs text-zinc-600 mt-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            {mode === 'login' ? (
              <>
                ¿No tienes cuenta?{' '}
                <button onClick={() => switchMode('register')} className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button onClick={() => switchMode('login')} className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-zinc-700 mt-6 animate-fade-in" style={{ animationDelay: '260ms' }}>
          Al continuar, aceptas los{' '}
          <span className="text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">Términos de uso</span>
          {' '}y la{' '}
          <span className="text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">Política de privacidad</span>
        </p>
      </div>
    </div>
  )
}
