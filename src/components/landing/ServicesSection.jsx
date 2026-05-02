import { useState, useEffect, useRef } from 'react'
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
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section id="servicios" className="content-band" ref={sectionRef}>
      <div className="section-container">
        <div className="section-heading centered">
          <h2>
            El servicio que <br />
            tú <span>necesitas</span>
          </h2>
        </div>
        <div className={`services-grid ${isVisible ? 'animate' : ''}`}>
          {services.map((service) => (
            <ServiceCard key={service.title} service={service} />
          ))} 
        </div>
      </div>
    </section>
  )
}
