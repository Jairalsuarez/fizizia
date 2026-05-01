import { Button } from '../ui/Button'
import { SectionKicker } from '../ui/SectionKicker'

export function ContactSection() {
  return (
    <section id="contacto" className="content-band bg-[#101510]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <SectionKicker>Cotiza en Ecuador</SectionKicker>
          <h2 className="mt-4 text-4xl font-black leading-tight text-white lg:text-5xl">
            Cuentanos que quieres construir.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#d9e9d0]">
            Este formulario se conectara con `contact_messages` y de ahi podras convertir cada solicitud en lead, cliente y proyecto.
          </p>
        </div>
        <form className="contact-form">
          <div className="form-grid">
            <label>Nombre<input placeholder="Tu nombre" /></label>
            <label>WhatsApp<input placeholder="+593 ..." /></label>
            <label>Ciudad<input placeholder="Quito, Guayaquil, Cuenca..." /></label>
            <label>Servicio<input placeholder="Landing, app, sistema..." /></label>
          </div>
          <label>Mensaje<textarea placeholder="Tengo un negocio y quiero..." rows="5" /></label>
          <Button size="large">Enviar solicitud</Button>
        </form>
      </div>
    </section>
  )
}
