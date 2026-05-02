import { footerServices, navItems, socialLinks } from '../data/fizziaContent'
import { Button } from './ui/Button'
import { Logo } from './ui/Logo'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Logo />
          <p>Desarrollo soluciones digitales a medida que impulsan negocios y conectan con las personas.</p>
          <div className="social-links">
            {socialLinks.map((social) => (
              <a href="#contacto" key={social} aria-label={social}>{social}</a>
            ))}
          </div>
        </div>
        <div>
          <h3>Navegacion</h3>
          {navItems.map((item) => (
            <a href={`#${item.toLowerCase()}`} key={item}>{item}</a>
          ))}
        </div>
        <div>
          <h3>Servicios</h3>
          {footerServices.map((service) => (
            <a href="#servicios" key={service}>{service}</a>
          ))}
        </div>
        <div>
          <h3>Conversemos</h3>
          <p>¿Tienes un proyecto? Estoy listo para ayudarte.</p>
          <Button href="mailto:fizziadev@outlook.com" variant="secondary">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '10px'}}>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            Enviar correo
          </Button>
          <address>
            <span>Ecuador</span>
            <span>fizziadev@outlook.com</span>
          </address>
        </div>
      </div>
      <small>© 2025 Fizzia.dev. Todos los derechos reservados.</small>
    </footer>
  )
}
