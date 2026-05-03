import { createLead } from '../../services/landingData'

async function handleStartProject() {
  try {
    await createLead({
      full_name: 'Visitante landing',
      status: 'new',
      source: 'landing_cta',
      metadata: { event: 'cta_click', page: 'home' },
    })
  } catch (error) {
    console.warn(error)
  }
  window.dispatchEvent(new Event('open-chatbot'))
}

export function ContactSection() {
  return (
    <section id="contacto" className="py-24 bg-dark-950 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-fizzia-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-fizzia-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-fizzia-500/10 text-fizzia-400 text-xs font-bold uppercase rounded-full mb-4">Clientes felices</span>
          <blockquote className="text-2xl md:text-3xl lg:text-4xl font-black text-white max-w-3xl mx-auto leading-tight">
            <span className="text-fizzia-400">"</span>
            Fizzia convirtió nuestra idea en una herramienta que optimizó todo nuestro trabajo.
            <span className="text-fizzia-400">"</span>
          </blockquote>
          <p className="mt-4 text-white font-bold">María González</p>
          <p className="text-dark-400 text-sm">Emprendedora</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-fizzia-700 via-fizzia-600 to-fizzia-500 p-8 md:p-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex flex-col gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                  ¿Tienes una idea en mente?
                </h2>
                <p className="mt-3 text-white/80 text-lg font-medium">
                  Hablemos y hagamos que suceda. Respuesta en menos de 24 horas.
                </p>
              </div>
              <button
                onClick={handleStartProject}
                className="shrink-0 px-8 py-4 bg-white text-fizzia-700 font-black rounded-xl hover:bg-fizzia-50 hover:shadow-lg transition-all text-lg"
              >
                Quiero empezar
              </button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-900 via-dark-900/95 to-fizzia-950/20 border border-dark-800 p-8 md:p-12 flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-48 h-48 bg-fizzia-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <div className="relative">
              <h3 className="text-xl font-bold text-white mb-3">
                ¿Listo para dar el siguiente paso?
              </h3>
              <p className="text-dark-400 text-sm leading-relaxed mb-6">
                Crea tu cuenta gratuita y accede a tu portal personalizado. Podrás ver el avance de tu proyecto, comunicarte con nosotros y gestionar todo desde un solo lugar.
              </p>
              <a
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 transition-all shadow-lg shadow-fizzia-500/25"
              >
                Crear cuenta gratis
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
