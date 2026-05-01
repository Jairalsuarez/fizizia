import { useEffect, useState } from 'react'
import { fallbackProjects, robots } from '../../data/fizziaContent'
import { getPortfolioProjects } from '../../services/portfolioProjects'
import { getProjectPreviewUrl } from '../../utils/projectPreview'
import { Button } from '../ui/Button'

export function ProjectsSection() {
  const [projects, setProjects] = useState(fallbackProjects)
  const [activeIndex, setActiveIndex] = useState(0)

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

  const visibleProjects = projects
    .slice(activeIndex)
    .concat(projects.slice(0, activeIndex))
    .slice(0, Math.min(3, projects.length))

  function goToPrevious() {
    setActiveIndex((currentIndex) => (currentIndex - 1 + projects.length) % projects.length)
  }

  function goToNext() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % projects.length)
  }

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
          {visibleProjects.map((project, index) => (
            <article className={`showcase-card ${['small', 'tall', 'food'][index]}`} key={project.id || project.slug}>
              {project.website_url ? (
                <img className="showcase-preview" src={getProjectPreviewUrl(project.website_url)} alt="" />
              ) : null}
              <span>{project.industry || 'Proyecto'}</span>
              <strong>{project.title}</strong>
              <p>{project.summary}</p>
            </article>
          ))}
        </div>
        <div className="slider-dots">
          <button aria-label="Anterior" onClick={goToPrevious} type="button">{'<'}</button>
          {projects.map((project, index) => (
            <button
              aria-label={`Ver proyecto ${index + 1}`}
              className={`project-dot ${index === activeIndex ? 'active' : ''}`}
              key={project.id || project.slug || index}
              onClick={() => setActiveIndex(index)}
              type="button"
            />
          ))}
          <button aria-label="Siguiente" onClick={goToNext} type="button">{'>'}</button>
        </div>
      </div>
    </section>
  )
}
