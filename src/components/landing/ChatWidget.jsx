import { useState, useEffect, useRef } from 'react'
import { createLead } from '../../services/landingData'

function ChatToggle({ isOpen, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-14 h-14 bg-fizzia-600 hover:bg-fizzia-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
      aria-label={isOpen ? 'Cerrar chat' : 'Abrir chat'}
    >
      <span className="material-symbols-rounded text-2xl">
        {isOpen ? 'close' : 'chat'}
      </span>
    </button>
  )
}

function ProgressBar({ step, totalSteps }) {
  const progress = (step / totalSteps) * 100
  return (
    <div className="w-full bg-dark-700 h-1 rounded-full overflow-hidden">
      <div
        className="bg-fizzia-500 h-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ name: '', email: '', project: '' })
  const [isSubmitted, setIsSubmitted] = useState(() => {
    return localStorage.getItem('fizzia_lead_submitted') === 'true'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const widgetRef = useRef(null)

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true)
    window.addEventListener('open-chatbot', handleOpenChat)
    return () => window.removeEventListener('open-chatbot', handleOpenChat)
  }, [])

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true)
    window.addEventListener('open-chatbot', handleOpenChat)
    return () => window.removeEventListener('open-chatbot', handleOpenChat)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await createLead({
        full_name: formData.name,
        email: formData.email,
        project_description: formData.project,
        source: 'chat_widget',
      })
      localStorage.setItem('fizzia_lead_submitted', 'true')
      setIsSubmitted(true)
    } catch (error) {
      console.warn(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="fixed bottom-6 right-6 z-50" ref={widgetRef}>
        <ChatToggle isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
        {isOpen && (
          <div className="absolute bottom-20 right-0 w-80 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl p-6">
            <div className="text-center">
              <span className="material-symbols-rounded text-fizzia-400 text-4xl mb-3 block">
                check_circle
              </span>
              <h3 className="text-white font-semibold text-lg mb-2">¡Gracias!</h3>
              <p className="text-dark-300 text-sm">
                Te contactaré pronto. Respuesta en menos de 24h.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50" ref={widgetRef}>
      <ChatToggle isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-fizzia-600 to-fizzia-500 p-4">
            <h3 className="text-white font-semibold">Hablemos de tu proyecto</h3>
            <p className="text-white/80 text-xs mt-1">Respuesta en menos de 24h</p>
          </div>

          <div className="p-4">
            <ProgressBar step={step} totalSteps={3} />

            <div className="mt-6 space-y-4">
              {step === 1 && (
                <div>
                  <label className="text-dark-300 text-sm block mb-2">¿Cómo te llamas?</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Tu nombre"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-fizzia-500 transition-colors"
                  />
                  <button
                    onClick={handleNext}
                    disabled={!formData.name}
                    className="w-full mt-3 bg-fizzia-600 hover:bg-fizzia-500 disabled:bg-dark-700 disabled:text-dark-400 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              )}

              {step === 2 && (
                <div>
                  <label className="text-dark-300 text-sm block mb-2">¿Tu correo electrónico?</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="tu@email.com"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-fizzia-500 transition-colors"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setStep(1)}
                      className="flex-1 bg-dark-800 hover:bg-dark-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!formData.email}
                      className="flex-1 bg-fizzia-600 hover:bg-fizzia-500 disabled:bg-dark-700 disabled:text-dark-400 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <label className="text-dark-300 text-sm block mb-2">Cuéntame de tu proyecto</label>
                  <textarea
                    name="project"
                    value={formData.project}
                    onChange={handleInputChange}
                    placeholder="Describe tu idea..."
                    rows="3"
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-fizzia-500 transition-colors resize-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 bg-dark-800 hover:bg-dark-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!formData.project || isSubmitting}
                      className="flex-1 bg-fizzia-600 hover:bg-fizzia-500 disabled:bg-dark-700 disabled:text-dark-400 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {isSubmitting ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
