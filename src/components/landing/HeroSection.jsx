import { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'

const benefits = [
  { label: 'Hecho a tu medida', icon: 'auto_awesome' },
  { label: 'Escalable', icon: 'query_stats' },
  { label: 'Moderno', icon: 'verified_user' },
  { label: 'Seguro', icon: 'security' },
]

export function HeroSection() {
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section id="inicio" ref={ref} className="relative min-h-screen flex items-center overflow-hidden bg-dark-950 pt-24 pb-16">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-fizzia-500/10 via-fizzia-500/5 to-transparent" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-fizzia-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-80 h-80 bg-fizzia-600/5 rounded-full blur-3xl" />
      </div>

      <div className={`relative mx-auto w-full max-w-6xl px-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-fizzia-500/10 border border-fizzia-500/20 rounded-full">
              <span className="w-2 h-2 bg-fizzia-400 rounded-full animate-pulse" />
              <span className="text-fizzia-400 text-xs font-semibold">Disponible para nuevos proyectos</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
              No busques más,{' '}
              <span className="text-fizzia-400">tu idea</span>{' '}
              tiene una solución digital.
            </h1>
            <p className="text-lg text-dark-300 max-w-lg leading-relaxed">
              Desarrollo sistemas, aplicaciones y experiencias digitales a la medida de tus necesidades.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <a
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 transition-all shadow-lg shadow-fizzia-500/25 hover:shadow-fizzia-500/40 text-base"
              >
                Empieza ahora — es gratis
                <Icon name="arrow_forward" size={18} />
              </a>
              <Button href="#contacto" variant="outline" size="lg">Cotiza tu proyecto</Button>
            </div>
            <div className="grid grid-cols-2 gap-6 pt-4">
              {benefits.map((b) => (
                <div key={b.label} className="flex items-center gap-3 text-dark-300">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-fizzia-500/10 text-fizzia-400">
                    <Icon name={b.icon} size={16} />
                  </div>
                  <span className="text-sm font-semibold">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`relative transition-all duration-1000 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="relative bg-dark-900 border border-dark-700 rounded-2xl overflow-hidden shadow-2xl shadow-fizzia-500/5">
              <div className="flex">
                <div className="w-24 bg-dark-950 border-r border-dark-700 p-4 space-y-4">
                  <span className="text-fizzia-400 font-bold text-sm">Fizzia</span>
                  <div className="space-y-3">
                    {['home', 'receipt_long', 'inventory_2', 'groups'].map((icon) => (
                      <div key={icon} className="flex items-center gap-2 text-dark-500 text-xs">
                        <Icon name={icon} size={14} />
                        <span className="hidden lg:inline">{icon.split('_')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">Dashboard</span>
                    <span className="px-3 py-1 bg-fizzia-500/10 text-fizzia-400 text-xs font-bold rounded-full">Hoy</span>
                  </div>
                  <div>
                    <p className="text-dark-400 text-sm">Ventas del mes</p>
                    <p className="text-2xl font-black text-white">$24,780.00</p>
                  </div>
                  <div className="h-24 bg-dark-950 rounded-lg border border-dark-700 flex items-center justify-center">
                    <svg viewBox="0 0 340 80" className="w-full h-16">
                      <path d="M6 60 C35 55 48 40 74 45 C102 50 111 20 138 30 C166 40 176 60 202 40 C228 20 236 10 264 25 C288 40 304 10 334 12" fill="none" stroke="#44a64a" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[{ v: '1,248', l: 'Pedidos' }, { v: '$12,430', l: 'Ingresos' }, { v: '320', l: 'Clientes' }, { v: '85%', l: 'Meta' }].map((s) => (
                      <div key={s.l} className="bg-dark-950 rounded-lg p-3 border border-dark-700">
                        <p className="text-fizzia-400 font-bold text-sm">{s.v}</p>
                        <p className="text-dark-500 text-xs">{s.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-fizzia-500/10 rounded-full blur-xl" />
          </div>
        </div>
      </div>
    </section>
  )
}
