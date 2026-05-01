import { SectionKicker } from '../ui/SectionKicker'
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

export function ContactSection() {
  return (
    <section id="contacto" className="contact-combined">
      {/* Testimonial */}
      <div className="contact-testimonial">
        <SectionKicker tone="dark">Clientes felices</SectionKicker>
        <blockquote>
          "Fizzia convirtio nuestra idea en una herramienta que optimizo todo nuestro trabajo."
        </blockquote>
        <strong>Maria Gonzalez</strong>
        <span>Emprendedora</span>
      </div>

      {/* CTA Box */}
      <div className="cta-section">
        <div>
          <h2>¿Tienes una idea en mente?</h2>
          <p>Hablemos y hagamos que suceda.</p>
        </div>
        <button className="dark-button" type="button" onClick={handleStartProject}>Quiero empezar</button>
        <img className="cta-logo-watermark" src="/images/logo-figura-transparent.png" alt="" />
      </div>
    </section>
  )
}
