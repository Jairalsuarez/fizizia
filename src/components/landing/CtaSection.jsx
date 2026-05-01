import { createContactMessage } from '../../services/contactMessages'

async function handleStartProject() {
  try {
    await createContactMessage({
      full_name: 'Visitante landing',
      service_interest: 'Proyecto digital',
      message: 'Click en CTA Quiero empezar desde la landing.',
      source: 'landing_cta',
      metadata: {
        event: 'cta_click',
        page: 'home',
      },
    })
  } catch (error) {
    console.warn(error)
  }
}

export function CtaSection() {
  return (
    <section id="contacto" className="cta-section">
      <div>
        <h2>¿Tienes una idea en mente?</h2>
        <p>Hablemos y hagamos que suceda.</p>
      </div>
      <button className="dark-button" type="button" onClick={handleStartProject}>Quiero empezar</button>
      <img className="cta-logo-watermark" src="/images/logo-figura-transparent.png" alt="" />
    </section>
  )
}
