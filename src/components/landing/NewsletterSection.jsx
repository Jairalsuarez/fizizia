import { useState } from 'react'

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email) {
      setSubmitted(true)
      setEmail('')
      setTimeout(() => setSubmitted(false), 3000)
    }
  }

  return (
    <section className="py-20 bg-dark-950 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-fizzia-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-fizzia-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark-900 via-dark-900/95 to-fizzia-950/30 border border-dark-800 p-8 md:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-fizzia-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative text-center max-w-2xl mx-auto">
            <span className="inline-block px-4 py-1.5 bg-fizzia-500/10 text-fizzia-400 text-xs font-bold uppercase rounded-full mb-4">Novedades</span>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight mb-4">
              Suscríbete para recibir <span className="text-fizzia-400">novedades</span>
            </h2>
            <p className="text-dark-400 text-lg mb-8">
              Recibe consejos, tendencias y ofertas exclusivas sobre desarrollo de software directamente en tu correo.
            </p>

            {submitted ? (
              <div className="bg-fizzia-500/10 border border-fizzia-500/30 rounded-xl p-6 text-fizzia-400 font-semibold">
                ¡Gracias por suscribirte! Revisa tu bandeja de entrada.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  required
                  className="flex-1 px-5 py-3 bg-dark-950 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:border-fizzia-500 transition-colors"
                />
                <button
                  type="submit"
                  className="px-8 py-3 bg-fizzia-500 hover:bg-fizzia-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-fizzia-500/25 whitespace-nowrap"
                >
                  Suscribirme
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
