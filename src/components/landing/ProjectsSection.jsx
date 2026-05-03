import { useState, useEffect, useCallback } from 'react'
import { getPublishedProjects } from '../../services/landingData'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

export function ProjectsSection() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    let mounted = true
    getPublishedProjects().then((data) => {
      if (mounted) {
        setProjects(data && data.length > 0 ? data : [])
        setLoading(false)
      }
    }).catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const goToPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + projects.length) % projects.length)
  }, [projects.length])

  const goToNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % projects.length)
  }, [projects.length])

  if (loading) {
    return (
      <section id="proyectos" className="py-24 bg-dark-950">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <Skeleton className="h-12 w-80 mx-auto mb-12 bg-dark-900" />
          <Skeleton className="w-80 h-56 rounded-2xl mx-auto bg-dark-900" />
        </div>
      </section>
    )
  }

  if (projects.length === 0) {
    return (
      <section id="proyectos" className="py-24 bg-dark-950">
        <div className="mx-auto max-w-6xl px-6">
          <EmptyState
            icon="folder_open"
            title="Próximamente"
            description="Los proyectos se están cargando. Mientras tanto, hablemos de tu idea."
            action={<Button href="#contacto" variant="outline">Cotiza tu proyecto</Button>}
          />
        </div>
      </section>
    )
  }

  const current = projects[activeIndex]

  return (
    <section id="proyectos" className="py-24 bg-dark-950 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fizzia-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <span className="inline-block px-4 py-1.5 bg-fizzia-500/10 text-fizzia-400 text-xs font-bold uppercase rounded-full mb-4">Portafolio</span>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-16">
          Mis proyectos son la <br />
          <span className="text-fizzia-400">prueba que necesitas</span>
        </h2>

        <div className="flex items-center justify-center gap-6 min-h-80">
          <button onClick={goToPrev} className="w-14 h-14 flex items-center justify-center rounded-full bg-dark-900 border border-dark-800 text-fizzia-400 hover:bg-fizzia-500 hover:text-white transition-all shrink-0" aria-label="Anterior">
            <Icon name="chevron_left" size={24} />
          </button>

          <div className="relative w-80 h-56 rounded-2xl overflow-hidden border border-dark-700 shadow-2xl shadow-fizzia-500/10 transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-br from-dark-900 to-black" />
            {current.thumbnail_url ? (
              <img src={current.thumbnail_url} alt={current.title} className="absolute inset-0 w-full h-full object-cover opacity-40" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon name="code" size={64} className="text-dark-700" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-left">
              <h3 className="text-white font-bold text-xl mb-1">{current.title}</h3>
              {current.summary && (
                <p className="text-dark-400 text-sm">{current.summary}</p>
              )}
            </div>
          </div>

          <button onClick={goToNext} className="w-14 h-14 flex items-center justify-center rounded-full bg-dark-900 border border-dark-800 text-fizzia-400 hover:bg-fizzia-500 hover:text-white transition-all shrink-0" aria-label="Siguiente">
            <Icon name="chevron_right" size={24} />
          </button>
        </div>

        <div className="flex justify-center gap-3 mt-8">
          {projects.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === activeIndex ? 'bg-fizzia-400 scale-125' : 'bg-dark-700 hover:bg-dark-500'}`}
              aria-label={`Ver proyecto ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
