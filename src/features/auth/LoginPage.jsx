import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn, resetPassword } from '../../api/authApi'
import { supabase } from '../../services/supabase'
import { useAuth } from './authContext'
import { getRoleHome } from './roles'

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
        navigate(getRoleHome(user.role), { replace: true })
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

  const handleGoogleSignIn = async () => {
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
        },
      })
      if (error) setError(error.message)
    } catch {
      setError('Error al conectar con Google')
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

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="cursor-pointer w-full mt-4 py-3 bg-dark-950 border border-dark-700 text-white font-medium rounded-xl hover:bg-dark-800 transition-all flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

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
