import { Icon } from '../ui/Icon'

const features = [
  {
    icon: 'dashboard',
    title: 'Panel de proyecto',
    description: 'Visualiza el avance de tu proyecto en tiempo real con hitos claros y actualizaciones constantes.',
  },
  {
    icon: 'chat',
    title: 'Comunicación directa',
    description: 'Habla directamente con tu equipo de desarrollo sin intermediarios ni demoras.',
  },
  {
    icon: 'account_balance_wallet',
    title: 'Gestión financiera',
    description: 'Revisa facturas, pagos y el estado de tu inversión de forma organizada y transparente.',
  },
  {
    icon: 'folder_open',
    title: 'Archivos y entregables',
    description: 'Accede a todos los archivos de tu proyecto, diseños, documentación y versiones anteriores.',
  },
  {
    icon: 'checklist',
    title: 'Aprobación de hitos',
    description: 'Aprueba cada etapa del desarrollo a tu ritmo. Tú decides cuándo avanzamos.',
  },
  {
    icon: 'notifications_active',
    title: 'Notificaciones',
    description: 'Recibe alertas cuando haya avances, entregables nuevos o mensajes del equipo.',
  },
]

export function PortalSection() {
  return (
    <section className="py-24 bg-dark-950 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-fizzia-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-fizzia-600/8 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-fizzia-500/10 text-fizzia-400 text-xs font-bold uppercase rounded-full mb-4">Portal de clientes</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight mb-4">
            Tu proyecto, <span className="text-fizzia-400">siempre visible</span>
          </h2>
          <p className="text-dark-400 text-lg max-w-2xl mx-auto">
            Al crear una cuenta en Fizzia obtienes acceso a un portal completo donde puedes seguir cada paso del desarrollo de tu proyecto.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 bg-dark-900/50 border border-dark-800 rounded-xl hover:border-fizzia-500/30 hover:bg-dark-900 transition-all duration-300"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-fizzia-500/10 text-fizzia-400 mb-4 group-hover:bg-fizzia-500/20 transition-colors">
                <Icon name={feature.icon} size={24} />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-dark-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 transition-all shadow-lg shadow-fizzia-500/25 hover:shadow-fizzia-500/40 text-lg"
          >
            Crea tu cuenta ahora
            <Icon name="arrow_forward" size={20} />
          </a>
          <p className="text-dark-500 text-sm mt-3">Sin compromiso. Acceso inmediato a tu portal.</p>
        </div>
      </div>
    </section>
  )
}
