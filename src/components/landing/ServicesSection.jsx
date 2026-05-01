import { services } from '../../data/fizziaContent'
import { SectionKicker } from '../ui/SectionKicker'
import { MaterialIcon } from '../ui/MaterialIcon'

function ServiceCard({ service }) {
  return (
    <article className="service-card">
      <span className="service-icon"><MaterialIcon name={service.icon} /></span>
      <h3>{service.title}</h3>
      <p>{service.text}</p>
      <a href="#contacto">Mas informacion {'->'}</a>
    </article>
  )
}

export function ServicesSection() {
  return (
    <section id="servicios" className="content-band bg-[#f4fbe9] text-[#101510]">
      <div className="section-container">
        <div className="section-heading centered">
          <SectionKicker tone="dark">Lo que hago</SectionKicker>
          <h2>
            Soluciones que impulsan <br />
            tu <span>mundo digital</span>
          </h2>
        </div>
        <div className="services-grid">
          {services.map((service) => (
            <ServiceCard key={service.title} service={service} />
          ))}
        </div>
      </div>
    </section>
  )
}
