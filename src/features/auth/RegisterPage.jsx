import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp, checkEmailExists } from '../../services/adminData'
import { useAuth } from './authContext'

const phrases = [
  'Tu próximo proyecto empieza aquí',
  'Crea, gestiona y crece con Fizzia',
  'El futuro digital de tu negocio',
  'Ideas que se convierten en realidad',
]

export function RegisterPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [age, setAge] = useState('')
  const [phone, setPhone] = useState('')
  const [useType, setUseType] = useState('personal')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [phraseIndex, setPhraseIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % phrases.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (session && !loading) navigate('/cliente', { replace: true })
  }, [session, loading, navigate])

  const handleEmailCheck = async (e) => {
    e.preventDefault()
    setError('')
    setCheckingEmail(true)
    try {
      const exists = await checkEmailExists(email)
      if (exists) {
        setError('Este email ya tiene una cuenta registrada. Inicia sesión o usa otro email.')
      } else {
        setStep(2)
      }
    } catch {
      setStep(2)
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleDetailsNext = (e) => {
    e.preventDefault()
    setError('')
    if (!firstName.trim()) {
      setError('Ingresa tu nombre')
      return
    }
    if (!lastName.trim()) {
      setError('Ingresa tu apellido')
      return
    }
    setStep(3)
  }

    const handleFinalSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setSubmitting(true)
    const fullName = `${firstName} ${lastName}`.trim()
    const metadata = {
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      role: 'client',
      age: age ? Number(age) : undefined,
      phone: phone || undefined,
      use_type: useType,
    }
    const { error } = await signUp(email, password, fullName, metadata)
    setSubmitting(false)
    if (error) {
      setError(error.message)
    } else {
      setRegistered(true)
    }
  }

  const back = () => {
    setError('')
    setStep(step - 1)
  }

  const inputClass = "w-full px-4 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 focus:ring-1 focus:ring-fizzia-500 transition-all"
  const btnClass = "cursor-pointer w-full py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-fizzia-500/25 hover:shadow-fizzia-500/40"
  const inputAttrs = { autoComplete: 'off', spellCheck: 'false' }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-6 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fizzia-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-fizzia-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fizzia-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <div className="flex bg-dark-900/50 border border-dark-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          {/* Left panel - decorative */}
          <div className="hidden md:flex md:w-2/5 bg-gradient-to-b from-fizzia-500 to-fizzia-700 flex-col justify-between p-8 relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" />
              <div className="absolute bottom-12 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            </div>

            {/* Animated floating objects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-16 left-8 w-10 h-10 border-2 border-white/20 rounded-lg rotate-12 animate-float-slow" />
              <div className="absolute top-32 right-6 w-6 h-6 border-2 border-white/30 rounded-full animate-float-fast" />
              <div className="absolute bottom-28 right-4 w-8 h-8 border border-white/15 rounded rotate-45 animate-float-slow" />
              <div className="absolute top-48 right-16 w-2 h-2 bg-white/30 rounded-full animate-bounce" />
            </div>

            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-6 animate-pulse">
                <img src="/images/Solo la figura del logo.png" alt="Fizzia" className="h-8 w-auto" onError={(e) => { e.target.style.display = 'none' }} />
              </div>
              <h2 className="text-xl font-bold text-white leading-tight">Tu próximo proyecto empieza aquí</h2>
            </div>

            <div className="relative z-10 min-h-[60px]">
              <p key={phraseIndex} className="text-white text-sm font-medium animate-fade-in-up leading-relaxed">
                {phrases[phraseIndex]}
              </p>
            </div>

            <div className="relative z-10">
              <p className="text-white/50 text-xs">© {new Date().getFullYear()} Fizzia.dev</p>
            </div>
          </div>

          {/* Right panel - form */}
          <div className="flex-1 p-8 md:p-10">
            <div className="lg:hidden text-center mb-6">
              <img src="/images/Solo la figura del logo.png" alt="Fizzia" className="h-12 w-auto mx-auto" onError={(e) => { e.target.style.display = 'none' }} />
            </div>

            {registered ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-fizzia-500/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fizzia-400">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">¡Gracias por registrarte!</h3>
                <p className="text-dark-300 text-sm mb-6 leading-relaxed max-w-xs mx-auto">
                  Revisa tu correo electrónico. Te enviamos un enlace de confirmación para activar tu cuenta.
                </p>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                  <p className="text-yellow-400 text-sm leading-relaxed">
                    ¿No encuentras el correo? Revisa tu carpeta de spam.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="cursor-pointer inline-block px-8 py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 transition-all shadow-lg shadow-fizzia-500/25"
                >
                  Ir a iniciar sesión
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-6">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-fizzia-500' : 'bg-dark-700'}`} />
                  ))}
                </div>

                <h3 className="text-xl font-bold text-white mb-1">
                  {step === 1 && '¿Cuál es tu email?'}
                  {step === 2 && 'Cuéntanos sobre ti'}
                  {step === 3 && 'Crea tu contraseña'}
                </h3>
                <p className="text-dark-400 text-sm mb-6">
                  {step === 1 && 'Verificaremos si ya tienes cuenta'}
                  {step === 2 && 'Necesitamos algunos datos para tu perfil'}
                  {step === 3 && 'Elige una contraseña segura'}
                </p>

                {step === 1 && (
                  <form onSubmit={handleEmailCheck} className="space-y-4">
                    <div>
                      <label className="block text-sm text-dark-300 mb-1.5">Email</label>
                      <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                      <input
                        type="email"
                        {...inputAttrs}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                        placeholder="tu@email.com"
                        required
                      />
                    </div>
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
                        {error}
                      </div>
                    )}
                    <button type="submit" disabled={checkingEmail} className={btnClass}>
                      {checkingEmail ? (
                        <span className="inline-flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Verificando...
                        </span>
                      ) : 'Continuar'}
                    </button>
                  </form>
                )}

                {step === 2 && (
                  <form onSubmit={handleDetailsNext} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-dark-300 mb-1.5">Nombre</label>
                        <input type="text" {...inputAttrs} value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} placeholder="Juan" required />
                      </div>
                      <div>
                        <label className="block text-sm text-dark-300 mb-1.5">Apellido</label>
                        <input type="text" {...inputAttrs} value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} placeholder="Pérez" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-dark-300 mb-1.5">Edad</label>
                        <input type="number" {...inputAttrs} value={age} onChange={(e) => setAge(e.target.value)} className={inputClass} placeholder="25" min="14" max="120" />
                      </div>
                      <div>
                        <label className="block text-sm text-dark-300 mb-1.5">Teléfono</label>
                        <input type="tel" {...inputAttrs} value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+52 55 1234 5678" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-1.5">¿Para qué usarás Fizzia?</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setUseType('personal')}
                          className={`cursor-pointer py-3 px-4 rounded-xl border text-sm font-medium transition-all ${useType === 'personal' ? 'border-fizzia-500 bg-fizzia-500/10 text-fizzia-400' : 'border-dark-700 bg-dark-950 text-dark-400 hover:text-white'}`}
                        >
                          Personal
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseType('business')}
                          className={`cursor-pointer py-3 px-4 rounded-xl border text-sm font-medium transition-all ${useType === 'business' ? 'border-fizzia-500 bg-fizzia-500/10 text-fizzia-400' : 'border-dark-700 bg-dark-950 text-dark-400 hover:text-white'}`}
                        >
                          Negocio
                        </button>
                      </div>
                    </div>
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
                        {error}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button type="button" onClick={back} className="py-3 px-6 bg-dark-800 text-white font-medium rounded-xl hover:bg-dark-700 transition-all">
                        Atrás
                      </button>
                      <button type="submit" className={btnClass}>Continuar</button>
                    </div>
                  </form>
                )}

                {step === 3 && (
                  <form onSubmit={handleFinalSubmit} className="space-y-4">
                    <div className="bg-dark-800/50 rounded-xl p-3 border border-dark-700">
                      <p className="text-sm text-dark-400">Registrando con:</p>
                      <p className="text-white font-medium text-sm">{email}</p>
                      <p className="text-dark-300 text-sm">{firstName} {lastName}</p>
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-1.5">Contraseña</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} {...inputAttrs} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Mínimo 6 caracteres" required minLength={6} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white transition-colors" tabIndex={-1}>
                          <span className="material-symbols-rounded text-xl">
                            {showPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-dark-300 mb-1.5">Confirmar contraseña</label>
                      <div className="relative">
                        <input type={showConfirmPassword ? 'text' : 'password'} {...inputAttrs} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Repite tu contraseña" required minLength={6} />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white transition-colors" tabIndex={-1}>
                          <span className="material-symbols-rounded text-xl">
                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center">
                        {error}
                      </div>
                    )}
                    <div className="flex gap-3">
                      <button type="button" onClick={back} className="py-3 px-6 bg-dark-800 text-white font-medium rounded-xl hover:bg-dark-700 transition-all">
                        Atrás
                      </button>
                      <button type="submit" disabled={submitting} className={btnClass}>
                        {submitting ? (
                          <span className="inline-flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Creando cuenta...
                          </span>
                        ) : 'Crear cuenta'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="mt-6 text-center">
                  <p className="text-dark-400 text-sm">
                    ¿Ya tienes cuenta?{' '}
                    <Link to="/login" className="text-fizzia-400 hover:text-fizzia-300 font-semibold transition-colors">
                      Inicia sesión
                    </Link>
                  </p>
                </div>
              </>
            )}
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
