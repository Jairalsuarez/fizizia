import { useState, useEffect } from 'react'
import { saveLead } from '../../services/leads'

export function ChatWidget({ onToggle }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(() => {
    return localStorage.getItem('fizzia_lead_submitted') === 'true'
  })
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ name: '', email: '', project: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Listen for custom event to open chat from anywhere
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true)
      if (onToggle) onToggle(true)
    }
    window.addEventListener('open-chatbot', handleOpenChat)
    return () => window.removeEventListener('open-chatbot', handleOpenChat)
  }, [onToggle])

  const toggleChat = () => {
    const nextState = !isOpen
    setIsOpen(nextState)
    if (onToggle) onToggle(nextState)
  }

  const handleNext = () => setStep(step + 1)
  const handleBack = () => setStep(step - 1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const result = await saveLead(formData)
    setIsSubmitting(false)
    if (result.success) {
      setIsSuccess(true)
      setHasSubmitted(true)
      localStorage.setItem('fizzia_lead_submitted', 'true')
      setTimeout(() => {
        setIsOpen(false)
        if (onToggle) onToggle(false)
        setStep(1)
        setFormData({ name: '', email: '', project: '' })
        setIsSuccess(false)
      }, 3000)
    }
  }

  const handleResend = () => {
    setHasSubmitted(false)
    setStep(1)
    setIsSuccess(false)
  }

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        className={`chat-widget-toggle ${isOpen ? 'hidden' : ''}`} 
        onClick={toggleChat}
        aria-label="Abrir chat"
      >
        <span className="material-symbols-rounded">chat</span>
      </button>

      {/* Chat Window */}
      <div className={`chat-widget-window ${isOpen ? 'open' : ''}`}>
        <div className="chatbot-header">
          <strong>Fizzia Assistant</strong>
          <button onClick={toggleChat} aria-label="Cerrar">&times;</button>
        </div>
        
        <div className="chatbot-content">
          {isSuccess ? (
            <div className="chatbot-success">
              <span>🎉</span>
              <h3>¡Excelente!</h3>
              <p>He recibido tus datos. Pronto me pondré en contacto contigo para hablar de tu proyecto.</p>
            </div>
          ) : hasSubmitted ? (
            <div className="chatbot-success already-submitted">
              <span>📩</span>
              <h3>¡Mensaje Recibido!</h3>
              <p>Tu mensaje ha llegado correctamente, por favor, espera a que un agente te contacte.</p>
              
              <div className="chatbot-already-actions">
                <button type="button" onClick={handleResend} className="chatbot-btn-resend">
                  Volver a enviar datos
                </button>
                <a href="mailto:fizziadev@outlook.com" className="chatbot-btn-email">
                  Escribir por correo
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
              {step === 1 && (
                <div className="chatbot-step">
                  <p>¡Hola! Me alegra que quieras hablar. ¿En qué tipo de proyecto estás interesado?</p>
                  <textarea 
                    autoFocus
                    placeholder="Ej. Quiero una tienda online para mi negocio..." 
                    value={formData.project} 
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    required
                  />
                  <div className="chatbot-actions">
                    <button type="submit" className="chatbot-btn-next">Siguiente</button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="chatbot-step">
                  <p>¡Genial! ¿Cuál es tu nombre completo?</p>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Tu nombre" 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <div className="chatbot-actions">
                    <button type="button" onClick={handleBack} className="chatbot-btn-back">Atrás</button>
                    <button type="submit" className="chatbot-btn-next">Siguiente</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="chatbot-step">
                  <p>Por último, ¿cuál es tu mejor correo electrónico para contactarte?</p>
                  <input 
                    type="email" 
                    autoFocus
                    placeholder="tu@correo.com" 
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  <div className="chatbot-actions">
                    <button type="button" onClick={handleBack} className="chatbot-btn-back">Atrás</button>
                    <button type="submit" disabled={isSubmitting} className="chatbot-btn-next">
                      {isSubmitting ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  )
}
