import { useState } from 'react'
import { saveLead } from '../../services/leads'

export function ChatbotModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ name: '', email: '', project: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!isOpen) return null

  const handleNext = () => setStep(step + 1)
  const handleBack = () => setStep(step - 1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const result = await saveLead(formData)
    setIsSubmitting(false)
    if (result.success) {
      setIsSuccess(true)
      setTimeout(() => {
        onClose()
        setStep(1)
        setFormData({ name: '', email: '', project: '' })
        setIsSuccess(false)
      }, 3000)
    } else {
      alert('Hubo un error al guardar tus datos. Inténtalo de nuevo.')
    }
  }

  return (
    <div className="chatbot-overlay" onClick={onClose}>
      <div className="chatbot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chatbot-header">
          <strong>Fizzia Assistant</strong>
          <button onClick={onClose} aria-label="Cerrar">&times;</button>
        </div>
        
        <div className="chatbot-content">
          {isSuccess ? (
            <div className="chatbot-success">
              <span>🎉</span>
              <h3>¡Excelente!</h3>
              <p>He recibido tus datos. Pronto me pondré en contacto contigo para hablar de tu proyecto.</p>
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
    </div>
  )
}
