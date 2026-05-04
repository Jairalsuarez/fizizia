import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { createProjectRequest } from '../../services/clientData'
import { ProjectTypeCard } from '../../components/ProjectTypeCard'

const PROJECT_TYPES = [
  { id: 'website', label: 'Sitio web', icon: 'language', desc: 'Landing page, portfolio o sitio corporativo' },
  { id: 'ecommerce', label: 'E-commerce', icon: 'shopping_cart', desc: 'Tienda online con carrito y pagos' },
  { id: 'webapp', label: 'App web', icon: 'web', desc: 'Aplicación web interactiva' },
  { id: 'mobile', label: 'App móvil', icon: 'smartphone', desc: 'Aplicación para iOS o Android' },
  { id: 'api', label: 'API / Backend', icon: 'dns', desc: 'Servicios e infraestructura' },
  { id: 'wedding', label: 'Invitación para bodas', icon: 'favorite', desc: 'Invitación digital para tu evento' },
]

const AUDIENCE_OPTIONS = ['personal', 'business', 'startup', 'enterprise']

const AUDIENCE_INFO = {
  personal: { label: 'Personal', icon: 'person', desc: 'Para uso personal o hobby' },
  business: { label: 'Negocio', icon: 'store', desc: 'Para mi negocio o empresa' },
  startup: { label: 'Startup', icon: 'rocket_launch', desc: 'Para un emprendimiento' },
  enterprise: { label: 'Empresa', icon: 'apartment', desc: 'Para una empresa grande' },
}

const BUDGET_RANGES = [
  { id: 'small', label: '$500 - $1,500', value: 1000, desc: 'Proyecto simple' },
  { id: 'medium', label: '$1,500 - $5,000', value: 3000, desc: 'Proyecto mediano' },
  { id: 'large', label: '$5,000 - $15,000', value: 10000, desc: 'Proyecto completo' },
  { id: 'custom', label: 'Personalizado', value: 0, desc: 'Tengo un presupuesto en mente' },
]

const FEATURES_BY_TYPE = {
  website: [
    'Diseño responsive', 'SEO', 'Blog', 'Multi-idioma',
    'Panel admin', 'Analytics', 'Login/Registro', 'Chat en vivo',
    'Galería de fotos', 'Formulario de contacto', 'Mapa interactivo', 'Newsletter',
  ],
  ecommerce: [
    'Pagos online', 'Carrito de compras', 'Base de datos', 'Panel admin',
    'Analytics', 'Login/Registro', 'Notificaciones', 'Gestión de inventario',
    'Cupones de descuento', 'Envío de correos', 'Reseñas de productos', 'Chat en vivo',
  ],
  webapp: [
    'Login/Registro', 'Base de datos', 'API REST', 'Panel admin',
    'Notificaciones', 'Analytics', 'Chat en vivo', 'Dashboard interactivo',
    'Roles y permisos', 'Exportar datos', 'Multi-idioma', 'Búsqueda avanzada',
  ],
  mobile: [
    'Login/Registro', 'API REST', 'Base de datos', 'Notificaciones push',
    'Analytics', 'Multi-idioma', 'Modo offline', 'Geolocalización',
    'Cámara y galería', 'Pagos en app', 'Chat en vivo', 'Compartir en redes',
  ],
  api: [
    'API REST', 'Base de datos', 'Analytics', 'Panel admin',
    'Autenticación JWT', 'Rate limiting', 'Documentación API', 'Webhooks',
    'Logging avanzado', 'Monitoreo', 'Escalabilidad', 'Backup automático',
  ],
  wedding: [
    'Diseño responsive', 'Multi-idioma', 'Galería de fotos', 'Contador regresivo',
    'Confirmación de asistencia', 'Mapa del evento', 'Mesa de regalos', 'Código de vestimenta',
    'Historia de la pareja', 'Playlist de la boda', 'Libro de firmas', 'Envío por email',
  ],
}

const STEP_LABELS = ['Información', 'Contexto', 'Detalles', 'Confirmar']

export function NewProjectPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    projectType: '',
    audience: '',
    budgetRange: '',
    customBudget: '',
    description: '',
    details: '',
    features: [],
    deadline: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key, value) => setFormData(prev => ({ ...prev, [key]: value }))

  const selectedFeatures = formData.projectType ? FEATURES_BY_TYPE[formData.projectType] || [] : []

  const canNext = {
    1: formData.name.trim() && formData.projectType,
    2: formData.audience && formData.budgetRange,
    3: formData.description.trim().length >= 10,
  }

  const handleNext = () => {
    setError('')
    if (canNext[step]) setStep(s => s + 1)
  }

  const handleBack = () => setStep(s => Math.max(1, s - 1))

  const toggleFeature = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const featuresText = formData.features.length ? `\n\nFuncionalidades: ${formData.features.join(', ')}` : ''
    const deadlineText = formData.deadline ? `\n\nFecha límite: ${formData.deadline}` : ''
    const audienceText = formData.audience ? `\n\nTipo: ${AUDIENCE_INFO[formData.audience]?.label || formData.audience}` : ''
    const budgetText = formData.customBudget
      ? `Presupuesto: $${Number(formData.customBudget).toLocaleString()}`
      : `Rango: ${BUDGET_RANGES.find(r => r.id === formData.budgetRange)?.label || formData.budgetRange}`

    const fullDesc = `${formData.description}\n\n${budgetText}${audienceText}\n\nDetalles: ${formData.details}${featuresText}${deadlineText}`

    try {
      const budget = formData.customBudget ? Number(formData.customBudget) : BUDGET_RANGES.find(r => r.id === formData.budgetRange)?.value || null
      const result = await createProjectRequest(formData.name, fullDesc, budget, formData.details)

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else if (result.project) {
        toast.success('¡Proyecto creado exitosamente!')
        navigate('/cliente/proyecto-creado', { state: { project: result.project } })
      }
    } catch (err) {
      setError(err.message || 'Error desconocido')
      toast.error('Error al crear el proyecto')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "w-full px-4 py-3.5 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 focus:ring-1 focus:ring-fizzia-500/50 transition-all"
  const btnPrimary = "cursor-pointer px-6 py-3.5 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-fizzia-500/25 hover:shadow-fizzia-500/40"
  const btnSecondary = "cursor-pointer px-6 py-3.5 bg-dark-800 text-white font-medium rounded-xl hover:bg-dark-700 transition-all"

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <button onClick={() => navigate('/cliente')} className="cursor-pointer flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-4">
          <span className="material-symbols-rounded text-lg">arrow_back</span>
          <span className="text-sm">Volver al dashboard</span>
        </button>
        <h1 className="text-3xl font-bold text-white">Nuevo proyecto</h1>
        <p className="text-dark-400 mt-1">Cuéntanos sobre tu proyecto y el equipo de Fizzia se pondrá en contacto</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center justify-between mb-10 max-w-md mx-auto">
        {STEP_LABELS.map((label, i) => {
          const s = i + 1
          const isCompleted = s < step
          const isCurrent = s === step

          return (
            <>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isCompleted ? 'bg-fizzia-500 text-white' :
                  isCurrent ? 'bg-fizzia-500 text-white shadow-lg shadow-fizzia-500/30' : 'bg-dark-800 text-dark-500'
                }`}>
                  {isCompleted ? (
                    <span className="material-symbols-rounded text-base">check</span>
                  ) : s}
                </div>
                <span className={`text-xs mt-2 font-medium ${
                  isCurrent ? 'text-white' :
                  isCompleted ? 'text-fizzia-400' : 'text-dark-600'
                }`}>{label}</span>
              </div>
              {s < 4 && (
                <div className={`flex-1 h-0.5 mx-3 mb-6 transition-all ${
                  s < step ? 'bg-fizzia-500' : 'bg-dark-800'
                }`} />
              )}
            </>
          )
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm text-center mb-6">
          {error}
        </div>
      )}

      {/* Step 1: Basic info */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-dark-300 mb-3">¿Cómo se llamará tu proyecto?</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => update('name', e.target.value)}
              className={inputClass}
              placeholder="Ej: Rediseño de mi sitio web, App de delivery..."
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-3">¿Qué tipo de proyecto necesitas?</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PROJECT_TYPES.map(type => (
                <ProjectTypeCard
                  key={type.id}
                  icon={type.icon}
                  label={type.label}
                  desc={type.desc}
                  isSelected={formData.projectType === type.id}
                  onClick={() => {
                    update('projectType', type.id)
                    setFormData(prev => ({ ...prev, features: [] }))
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => navigate('/cliente')} className={btnSecondary}>Cancelar</button>
            <button onClick={handleNext} disabled={!canNext[1]} className={btnPrimary}>Continuar</button>
          </div>
        </div>
      )}

      {/* Step 2: Context */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-dark-300 mb-3">¿Para quién es el proyecto?</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AUDIENCE_OPTIONS.map(aud => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => update('audience', aud)}
                  className={`cursor-pointer flex flex-col items-center text-center p-4 rounded-xl border transition-all min-h-[120px] ${
                    formData.audience === aud
                      ? 'border-fizzia-500 bg-fizzia-500/10'
                      : 'border-dark-700 bg-dark-900/50 hover:border-dark-600'
                  }`}
                >
                  <span className={`material-symbols-rounded text-2xl mb-2 ${
                    formData.audience === aud ? 'text-fizzia-400' : 'text-dark-400'
                  }`}>{AUDIENCE_INFO[aud].icon}</span>
                  <p className="text-white text-sm font-medium leading-snug mb-1">{AUDIENCE_INFO[aud].label}</p>
                  <p className="text-dark-500 text-xs leading-snug line-clamp-2">{AUDIENCE_INFO[aud].desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-dark-300 mb-3">¿Cuál es tu rango de presupuesto?</label>
            <div className="grid grid-cols-2 gap-3">
              {BUDGET_RANGES.map(range => (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => {
                    update('budgetRange', range.id)
                    if (range.id !== 'custom') update('customBudget', '')
                  }}
                  className={`cursor-pointer flex flex-col items-start text-left p-4 rounded-xl border transition-all min-h-[80px] ${
                    formData.budgetRange === range.id
                      ? 'border-fizzia-500 bg-fizzia-500/10'
                      : 'border-dark-700 bg-dark-900/50 hover:border-dark-600'
                  }`}
                >
                  <p className="text-white text-sm font-semibold">{range.label}</p>
                  <p className="text-dark-500 text-xs mt-1">{range.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {formData.budgetRange === 'custom' && (
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Tu presupuesto (USD)</label>
              <input
                type="number"
                value={formData.customBudget}
                onChange={(e) => update('customBudget', e.target.value)}
                className={inputClass}
                placeholder="Ej: 2500"
                min={100}
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">¿Tienes una fecha límite?</label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => update('deadline', e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={handleBack} className={btnSecondary}>Atrás</button>
            <button onClick={handleNext} disabled={!canNext[2]} className={btnPrimary}>Continuar</button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Describe tu proyecto <span className="text-dark-600">(mínimo 10 caracteres)</span></label>
            <textarea
              value={formData.description}
              onChange={(e) => update('description', e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Cuéntanos qué necesitas, qué problema quieres resolver..."
              rows={4}
            />
            <p className={`text-xs mt-1 ${formData.description.length >= 10 ? 'text-green-400' : 'text-dark-500'}`}>
              {formData.description.length}/10 mínimo
            </p>
          </div>

          {selectedFeatures.length > 0 && (
            <div>
              <label className="block text-sm text-dark-300 mb-3">Funcionalidades que necesitas</label>
              <div className="flex flex-wrap gap-2">
                {selectedFeatures.map(feat => (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => toggleFeature(feat)}
                    className={`cursor-pointer px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.features.includes(feat)
                        ? 'bg-fizzia-500/20 text-fizzia-400 border border-fizzia-500/30'
                        : 'bg-dark-900 text-dark-400 border border-dark-700 hover:text-white'
                    }`}
                  >
                    {feat}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Detalles adicionales <span className="text-dark-600">(opcional)</span></label>
            <textarea
              value={formData.details}
              onChange={(e) => update('details', e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Tecnologías preferidas, referencias, requisitos especiales..."
              rows={3}
            />
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={handleBack} className={btnSecondary}>Atrás</button>
            <button onClick={handleNext} disabled={!canNext[3]} className={btnPrimary}>Revisar y enviar</button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">Resumen del proyecto</h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-dark-500 mb-1">Nombre</p>
                <p className="text-white font-medium">{formData.name}</p>
              </div>
              <div>
                <p className="text-dark-500 mb-1">Tipo</p>
                <p className="text-white font-medium">{PROJECT_TYPES.find(t => t.id === formData.projectType)?.label}</p>
              </div>
              <div>
                <p className="text-dark-500 mb-1">Para</p>
                <p className="text-white font-medium">{AUDIENCE_INFO[formData.audience]?.label}</p>
              </div>
              <div>
                <p className="text-dark-500 mb-1">Presupuesto</p>
                <p className="text-white font-medium">
                  {formData.customBudget ? `$${Number(formData.customBudget).toLocaleString()}` : BUDGET_RANGES.find(r => r.id === formData.budgetRange)?.label}
                </p>
              </div>
              {formData.deadline && (
                <div>
                  <p className="text-dark-500 mb-1">Fecha límite</p>
                  <p className="text-white font-medium">{formData.deadline}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-dark-500 text-sm mb-1">Descripción</p>
              <p className="text-white text-sm whitespace-pre-wrap">{formData.description}</p>
            </div>

            {formData.features.length > 0 && (
              <div>
                <p className="text-dark-500 text-sm mb-2">Funcionalidades</p>
                <div className="flex flex-wrap gap-2">
                  {formData.features.map(f => (
                    <span key={f} className="px-2.5 py-1 bg-fizzia-500/10 text-fizzia-400 rounded-lg text-xs font-medium">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {formData.details && (
              <div>
                <p className="text-dark-500 text-sm mb-1">Detalles adicionales</p>
                <p className="text-white text-sm whitespace-pre-wrap">{formData.details}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex justify-between pt-4">
              <button type="button" onClick={handleBack} className={btnSecondary}>Editar</button>
              <button type="submit" disabled={submitting} className={btnPrimary}>
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enviando...
                  </span>
                ) : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
