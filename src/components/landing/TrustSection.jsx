import { useState, useEffect, useRef } from 'react'
import { trustIndicators, techStack } from '../../data/fizziaContent'

export function TrustSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.2 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-20 md:py-32 bg-dark-950 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-fizzia-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-fizzia-600/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {trustIndicators.map((metric, index) => (
            <div
              key={metric.label}
              className={`bg-dark-900/50 border border-dark-800 rounded-xl p-6 text-center hover:border-fizzia-500/30 transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <strong className="text-fizzia-400 text-3xl md:text-4xl font-black block mb-2">
                {metric.value}
              </strong>
              <span className="text-dark-300 text-sm">{metric.label}</span>
            </div>
          ))}
        </div>

        <div className={`text-center transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-dark-400 text-sm font-medium mb-6 uppercase tracking-wider">
            Tecnologías que utilizo
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="bg-dark-900 border border-dark-800 text-dark-200 px-4 py-2 rounded-full text-sm hover:border-fizzia-500/30 hover:text-white transition-all duration-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
