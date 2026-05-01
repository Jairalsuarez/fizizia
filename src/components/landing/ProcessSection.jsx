import { processSteps } from '../../data/fizziaContent'
import { robots } from '../../data/fizziaContent'
import { SectionKicker } from '../ui/SectionKicker'
import { MaterialIcon } from '../ui/MaterialIcon'

export function ProcessSection() {
  return (
    <section id="proceso" className="process-section">
      <div className="section-container">
        <div className="section-heading centered">
          <SectionKicker tone="dark">Mi proceso</SectionKicker>
          <h2>
            Simple, claro y <span>efectivo</span>
          </h2>
        </div>
        <img className="process-robot" src={robots.wave} alt="Robot Fizzia acompanando el proceso" />
        <div className="process-list">
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
