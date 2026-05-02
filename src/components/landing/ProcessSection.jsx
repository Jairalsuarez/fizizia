import { useState, useEffect, useRef } from 'react'
import { processSteps } from '../../data/fizziaContent'
import { robots } from '../../data/fizziaContent'
import { SectionKicker } from '../ui/SectionKicker'
import { MaterialIcon } from '../ui/MaterialIcon'

export function ProcessSection() {
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
    <section id="proceso" className="process-section" ref={sectionRef}>
      <div className="section-container">
        <div className="section-heading centered">
          
          <h2>
            Bueno, Bonito y <span>Barato</span>
          </h2>
        </div>
        <div className={`process-list ${isVisible ? 'animate' : ''}`}>
          {processSteps.map((step, index) => (
            <div className="process-item" key={step.title}>
              <div className="process-marker">
                <b>{index + 1}</b>
                <MaterialIcon name={step.icon} />
              </div>
              <strong>{step.title}</strong>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
