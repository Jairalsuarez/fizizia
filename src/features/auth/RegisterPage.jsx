import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signUp, checkEmailExists } from '../../services/adminData'
import { useAuth } from './authContext'

const benefits = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    title: 'Seguimiento en tiempo real',
    description: 'Visualiza cada etapa del desarrollo de tu proyecto con actualizaciones constantes.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Comunicación directa',
    description: 'Habla con tu equipo de desarrollo sin intermediarios ni demoras innecesarias.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    title: 'Facturas y pagos claros',
    description: 'Acceso transparente a tu historial financiero, facturas y estado de pagos.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: 'Entregables organizados',
    description: 'Todos los archivos, diseños y documentación de tu proyecto en un solo lugar.',
  },
]

const inputAttrs = {
  autoComplete: 'off',
  name: Math.random().toString(36).slice(2, 10),
  id: Math.random().toString(36).slice(2, 10),
}

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
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { session } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/cliente', { replace: true })
  }, [session, navigate])

  const handleEmailCheck = async (e) => {
    e.preventDefault()
    setError('')
    setCheckingEmail(true)
    try {
      const exists = await checkEmailExists(email)
      if (exists) {
        setError('Este email ya tiene una cuenta registrada')
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
      first_name: firstName,
      last_name: lastName,
      age: age ? Number(age) : undefined,
      phone: phone || undefined,
      use_type: useType,
    }
    const { error } = await signUp(email, password, fullName, metadata)
    setSubmitting(false)
    if (error) setError(error.message)
  }

  const back = () => {
    setError('')
    setStep(step - 1)
  }

  const inputClass = "w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 focus:ring-1 focus:ring-fizzia-500 transition-all"
  const btnClass = "w-full py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-fizzia-500/25 hover:shadow-fizzia-500/40"

  return (
    <div className="min-h-screen flex bg-dark-950">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-dark-950 via-fizzia-700 to-fizzia-500 flex-col justify-between p-12">
        <div className="absolute inset-0">
          <div className="absolute top-32 right-20 w-80 h-80 bg-fizzia-400/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-32 left-20 w-72 h-72 bg-fizzia-300/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(50,168,82,0.2),transparent_60%)]" />
        </div>

        <div className="relative z-10">
          <a href="/" className="inline-flex items-center gap-3">
            <img src="/images/Logo completo con slogan.png" alt="Fizzia" className="h-12 w-auto" onError={(e) => { e.target.style.display = 'none' }} />
            <span className="text-white font-black text-2xl">Fizzia</span>
          </a>
        </div>

        <div className="relative z-10 max-w-lg space-y-8">
          <div>
            <h1 className="text-4xl font-black text-white leading-tight mb-4">
              Tu portal de proyecto te espera
            </h1>
            <p className="text-white/70 text-lg leading-relaxed">
              Al crear tu cuenta accedes a un espacio exclusivo donde podrás seguir cada paso del desarrollo, aprobar entregables y mantener comunicación directa con tu equipo.
            </p>
          </div>

          <div className="space-y-4">
            {benefits.map((benefit, i) => (
              <div
                key={i}
                className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-fizzia-400/20 flex items-center justify-center text-fizzia-300 shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{benefit.title}</h3>
                  <p className="text-white/60 text-xs mt-0.5 leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/40 text-sm">© {new Date().getFullYear()} Fizzia.dev — Desarrollo a medida</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(50,168,82,0.08),transparent_60%)]" />

        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center lg:text-left mb-8">
            <div className="lg:hidden mb-6 flex justify-center">
              <img src="/images/Solo la figura del logo.png" alt="Fizzia" className="h-16 w-auto" onError={(e) => { e.target.style.display = 'none' }} />
            </div>
            <div className="flex items-center gap-2 mb-3">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-fizzia-500' : 'bg-dark-700'}`} />
              ))}
            </div>
            <h2 className="text-2xl font-bold text-white">
              {step === 1 && '¿Cuál es tu email?'}
              {step === 2 && 'Cuéntanos sobre ti'}
              {step === 3 && 'Crea tu contraseña'}
            </h2>
            <p className="text-dark-400 text-sm mt-1">
              {step === 1 && 'Verificaremos si ya tienes una cuenta'}
              {step === 2 && 'Necesitamos algunos datos para tu perfil'}
              {step === 3 && 'Elige una contraseña segura para tu cuenta'}
            </p>
          </div>

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
                    className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${useType === 'personal' ? 'border-fizzia-500 bg-fizzia-500/10 text-fizzia-400' : 'border-dark-700 bg-dark-900 text-dark-400 hover:text-white'}`}
                  >
                    Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseType('business')}
                    className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${useType === 'business' ? 'border-fizzia-500 bg-fizzia-500/10 text-fizzia-400' : 'border-dark-700 bg-dark-900 text-dark-400 hover:text-white'}`}
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
                <input type="password" {...inputAttrs} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Confirmar contraseña</label>
                <input type="password" {...inputAttrs} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="Repite tu contraseña" required minLength={6} />
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

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-dark-700" />
            <span className="text-dark-500 text-xs">o</span>
            <div className="flex-1 h-px bg-dark-700" />
          </div>

          <div className="mt-6 text-center">
            <p className="text-dark-400 text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-fizzia-400 hover:text-fizzia-300 font-semibold transition-colors">
                Inicia sesión
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
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
    </div>
  )
}
