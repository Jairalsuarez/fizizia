import { Icon } from '../ui/Icon'

const services = [
  { name: 'Sistemas Web', short_description: 'Plataformas a medida para gestionar y automatizar tu negocio.', icon_name: 'code_blocks' },
  { name: 'Aplicaciones Móviles', short_description: 'Apps personalizadas para Android y iOS que conectan con tus usuarios.', icon_name: 'phone_iphone' },
  { name: 'Tiendas Online', short_description: 'E-commerce modernos, seguros y listos para vender.', icon_name: 'shopping_cart' },
  { name: 'Gestión de Inventarios', short_description: 'Control total de tus productos, stock y movimientos.', icon_name: 'inventory_2' },
  { name: 'Sistemas de Ventas', short_description: 'Facturación, clientes, reportes y más. Todo en un solo lugar.', icon_name: 'monitoring' },
  { name: 'Invitaciones de bodas', short_description: 'Invitaciones interactivas y personalizadas para tu gran día.', icon_name: 'favorite' },
]

export function ServicesSection() {
  return (
    <section id="servicios" className="relative py-24 bg-dark-950 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-fizzia-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-fizzia-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-fizzia-500/10 text-fizzia-400 text-xs font-bold uppercase rounded-full mb-4">Qué hacemos</span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
            El servicio que <br />
            tu <span className="text-fizzia-400">necesitas</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => (
            <a
              key={service.name}
              href="#contacto"
              className="group block p-6 bg-dark-900/50 border border-dark-800 rounded-xl hover:border-fizzia-500/30 hover:bg-dark-900 transition-all duration-300"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-fizzia-500/10 text-fizzia-400 mb-4 group-hover:bg-fizzia-500/20 transition-colors">
                <Icon name={service.icon_name || 'code'} size={24} />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{service.name}</h3>
              <p className="text-dark-400 text-sm leading-relaxed mb-4">{service.short_description}</p>
              <span className="text-fizzia-400 text-sm font-semibold group-hover:underline">Más información {'->'}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
