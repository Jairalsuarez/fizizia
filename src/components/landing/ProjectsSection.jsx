import { useEffect, useState } from 'react'
import { robots } from '../../data/fizziaContent'
import { getPortfolioProjects } from '../../services/portfolioProjects'
import { getProjectPreviewUrl, getPlaceholderUrl } from '../../utils/projectPreview'

export function ProjectsSection() {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    let isMounted = true
    getPortfolioProjects().then((items) => {
      if (isMounted) {
        setProjects(items && items.length > 0 ? items : [])
        setIsLoading(false)
      }
    })
    return () => { isMounted = false }
  }, [])

  if (isLoading || projects.length === 0) {
    return (
      <section id="proyectos" className="projects-section">
        <div className="projects-header">
          <h2>Cargando proyectos...</h2>
        </div>
        <div className="project-showcase loading">
          <div className="loading-spinner"></div>
        </div>
      </section>
    )
  }

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
      <div className="projects-header">
        <h2>
          Mis proyectos son la <br />
          <span>prueba que necesitas</span>
        </h2>
      </div>

      <div className="project-showcase">
        <div className="cards-wrapper">
          {visibleProjects.map((project, index) => (
            <article 
              className={`showcase-card ${['small', 'tall', 'food'][index]}`} 
              key={project.id || project.slug || index}
              onClick={() => {
                if (project.website_url) window.open(project.website_url, '_blank')
              }}
              style={{ cursor: project.website_url ? 'pointer' : 'default' }}
            >
              {project.website_url ? (
                <img 
                  className="showcase-preview" 
                  src={getProjectPreviewUrl(project.website_url)} 
                  onError={(e) => { e.target.onerror = null; e.target.src = getPlaceholderUrl(index); }}
                  alt="" 
                />
              ) : (
                <img 
                  className="showcase-preview" 
                  src={getPlaceholderUrl(index)} 
                  alt="" 
                />
              )}
              <strong>{project.title}</strong>
            </article>
          ))}
        </div>
        
        <div className="slider-dots">
          <button aria-label="Anterior" onClick={goToPrevious} type="button">
            <span className="material-symbols-rounded">chevron_left</span>
          </button>
          <div className="dots-nav">
            {projects.map((_, index) => (
              <i 
                key={index} 
                className={`fizzia-dot ${index === activeIndex ? 'active' : ''}`}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
          <button aria-label="Siguiente" onClick={goToNext} type="button">
            <span className="material-symbols-rounded">chevron_right</span>
          </button>
        </div>
      </div>
    </section>
  )
}
