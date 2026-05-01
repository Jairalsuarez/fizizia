import { useEffect, useState } from 'react'
import { fallbackProjects, robots } from '../../data/fizziaContent'
import { getPortfolioProjects } from '../../services/portfolioProjects'
import { Button } from '../ui/Button'

export function ProjectsSection() {
  const [projects, setProjects] = useState(fallbackProjects)

  useEffect(() => {
    let isMounted = true

    getPortfolioProjects().then((items) => {
      if (isMounted) {
        setProjects(items)
      }
    })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section id="proyectos" className="projects-section">
      <div className="projects-panel">
        <div className="projects-copy">
          <span>Mi trabajo</span>
          <h2>
            Proyectos que hablan <br />
            por <span>si solos</span>
          </h2>
          <p>Cada proyecto es unico, funcional y disenado para generar impacto.</p>
          <Button href="#contacto" size="large">Ver todos los proyectos</Button>
        </div>
        <div className="project-showcase">
          <img className="projects-robot" src={robots.laptop} alt="Robot Fizzia revisando proyectos" />
          {projects.slice(0, 3).map((project, index) => (
            <article className={`showcase-card ${['small', 'tall', 'food'][index]}`} key={project.id || project.slug}>
              <span>{project.industry || 'Proyecto'}</span>
              <strong>{project.title}</strong>
              <p>{project.summary}</p>
            </article>
          ))}
        </div>
        <div className="slider-dots">
          <button aria-label="Anterior">{'<'}</button>
          <span />
          <span />
          <span />
          <button aria-label="Siguiente">{'>'}</button>
        </div>
      </div>
    </section>
  )
}
