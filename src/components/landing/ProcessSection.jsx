import { useState, useEffect, useRef } from 'react'
import { Icon } from '../ui/Icon'

const steps = [
  { title: 'Hablamos', text: 'Cuéntame tu idea en una reunión virtual.', icon: 'forum' },
  { title: 'Planificamos', text: 'Definimos el alcance, tecnología y tiempos.', icon: 'groups' },
  { title: 'Desarrollamos', text: 'Creamos tu proyecto con calidad y enfoque.', icon: 'draw' },
  { title: 'Entregamos', text: 'Probamos, lanzamos y te acompañamos.', icon: 'deployed_code' },
]

export function ProcessSection() {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="proceso" ref={ref} className="relative py-24 bg-dark-950 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-fizzia-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-fizzia-600/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center mb-20">
          <span className="inline-block px-4 py-1.5 bg-fizzia-500/10 text-fizzia-400 text-xs font-bold uppercase rounded-full mb-4">Cómo trabajamos</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
            De la idea al lanzamiento{' '}
            <span className="text-fizzia-400">sin complicaciones</span>
          </h2>
        </div>

        <div className={`relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 ${visible ? 'animate-fade-in' : 'opacity-0'}`}>
          <div className="hidden lg:block absolute top-10 left-1/6 right-1/6 h-px border-t-2 border-dashed border-fizzia-500/30" />

          {steps.map((step, i) => (
            <div
              key={step.title}
              className="relative flex flex-col items-center text-center"
              style={{ animationDelay: visible ? `${i * 0.15}s` : '0s' }}
            >
              <div className="relative z-10 w-20 h-20 flex items-center justify-center rounded-full bg-dark-900 border-2 border-fizzia-500/30 text-fizzia-400 mb-6">
                <Icon name={step.icon} size={28} />
                <span className="absolute -top-1 -right-1 w-8 h-8 flex items-center justify-center rounded-full bg-fizzia-500 text-white text-xs font-black">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-fizzia-400 font-black text-lg mb-2">{step.title}</h3>
              <p className="text-dark-400 text-sm leading-relaxed max-w-52">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
