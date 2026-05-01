import { SectionKicker } from '../ui/SectionKicker'

export function TestimonialSection() {
  return (
    <section className="testimonial-section">
      <button aria-label="Testimonio anterior">‹</button>
      <div>
        <SectionKicker tone="dark">Clientes felices</SectionKicker>
        <blockquote>
          “Fizzia convirtio nuestra idea en una herramienta que optimizo todo nuestro trabajo.”
        </blockquote>
        <strong>Maria Gonzalez</strong>
        <span>Emprendedora</span>
        <div className="testimonial-dots"><i /><i /><i /><i /></div>
      </div>
      <button aria-label="Siguiente testimonio">›</button>
    </section>
  )
}
