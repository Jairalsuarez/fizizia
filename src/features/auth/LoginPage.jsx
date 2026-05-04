import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn, resetPassword } from '../../services/adminData'
import { useAuth } from './authContext'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const { session, user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=signup') || hash.includes('type=recovery')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuccess('¡Email confirmado! Ya puedes iniciar sesión')
      window.history.replaceState(null, '', '/login')
    }
  }, [])

  useEffect(() => {
    const redirect = async () => {
      if (session && user && !loading && !redirecting) {
        setRedirecting(true)
        await new Promise(r => setTimeout(r, 800))
        const userRole = user.role
        if (['admin', 'manager'].includes(userRole)) {
          navigate('/admin', { replace: true })
        } else {
          navigate('/cliente', { replace: true })
        }
      }
    }
    redirect()
  }, [session, user, loading, redirecting, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const { error } = await signIn(email, password)
      setSubmitting(false)
      if (error) setError(error.message)
    } catch {
      setSubmitting(false)
      setError('Error al conectar con el servidor')
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { error } = await resetPassword(email)
      setSubmitting(false)
      if (error) {
        setError(error.message)
      } else {
        setResetSent(true)
      }
    } catch {
      setSubmitting(false)
      setError('Error al conectar con el servidor')
    }
  }

  if (redirecting || (session && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 p-6">
        <div className="text-center space-y-4">
          <img src="/images/Solo la figura del logo.png" alt="Fizzia" className="h-16 w-auto mx-auto" onError={(e) => { e.target.style.display = 'none' }} />
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fizzia-500 mx-auto"></div>
          <p className="text-dark-400 text-sm">Ingresando a tu portal...</p>
        </div>
      </div>
    )
  }

  if (showReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 p-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fizzia-500/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-fizzia-600/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fizzia-500/3 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <a href="/" className="inline-flex items-center gap-3 mb-6">
              <img src="/images/Solo la figura del logo.png" alt="Fizzia" className="h-16 w-auto" onError={(e) => { e.target.style.display = 'none' }} />
            </a>
            <h2 className="text-2xl font-bold text-white">Recuperar contraseña</h2>
            <p className="text-dark-400 text-sm mt-1">Te enviaremos un enlace para restablecerla</p>
          </div>

          <div className="bg-dark-900/50 border border-dark-800 rounded-2xl p-8 backdrop-blur-sm">
            {resetSent ? (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-fizzia-500/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" className="text-fizzia-400">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Revisa tu email</h3>
                <p className="text-dark-300 text-sm mb-4">Enviamos el enlace a:</p>
                <div className="bg-dark-800/50 rounded-xl p-3 border border-dark-700 inline-block mb-6">
                  <p className="text-white font-medium text-sm">{email}</p>
                </div>
                <p className="text-dark-400 text-sm mb-6 leading-relaxed">
                  Haz clic en el enlace del correo para crear una nueva contraseña. Revisa spam si no lo encuentras.
                </p>
                <button
                  onClick={() => { setShowReset(false); setResetSent(false) }}
                  className="cursor-pointer w-full py-3 bg-dark-800 text-white font-medium rounded-xl hover:bg-dark-700 transition-all"
                >
                  Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 focus:ring-1 focus:ring-fizzia-500 transition-all"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer w-full py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-fizzia-500/25"
                >
                  {submitting ? 'Enviando...' : 'Enviar enlace'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="cursor-pointer w-full py-3 bg-dark-800 text-white font-medium rounded-xl hover:bg-dark-700 transition-all"
                >
                  Volver al inicio de sesión
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 text-center">
            <a href="/" className="inline-flex items-center gap-1 text-dark-500 hover:text-dark-300 text-sm transition-colors">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-6 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fizzia-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-fizzia-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fizzia-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3 mb-6">
            <img src="/images/Solo la figura del logo.png" alt="Fizzia" className="h-16 w-auto" onError={(e) => { e.target.style.display = 'none' }} />
          </a>
          <h2 className="text-2xl font-bold text-white">Inicia sesión</h2>
          <p className="text-dark-400 text-sm mt-1">Accede a tu portal de Fizzia</p>
        </div>

        <div className="bg-dark-900/50 border border-dark-800 rounded-2xl p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Email</label>
              <input
                type="email"
                autoComplete="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 focus:ring-1 focus:ring-fizzia-500 transition-all"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 focus:ring-1 focus:ring-fizzia-500 transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  <span className="material-symbols-rounded text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-fizzia-500/10 border border-fizzia-500/30 rounded-xl p-3 text-fizzia-400 text-sm text-center">
                {success}
              </div>
            )}

            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="cursor-pointer text-sm text-dark-400 hover:text-fizzia-400 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="cursor-pointer w-full py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-fizzia-500/25 hover:shadow-fizzia-500/40"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando...
                </span>
              ) : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-dark-700" />
            <span className="text-dark-500 text-xs">o</span>
            <div className="flex-1 h-px bg-dark-700" />
          </div>

          <div className="mt-6 text-center">
            <p className="text-dark-400 text-sm">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-fizzia-400 hover:text-fizzia-300 font-semibold transition-colors">
                Crea tu cuenta gratis
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="inline-flex items-center gap-1 text-dark-500 hover:text-dark-300 text-sm transition-colors">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  )
}
