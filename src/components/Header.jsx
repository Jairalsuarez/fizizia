import { navItems } from '../data/fizziaContent'
import { Button } from './ui/Button'
import { Logo } from './ui/Logo'

export function Header() {
  return (
    <nav className="site-nav">
      <Logo />
      <div className="nav-links">
        {navItems.map((item) => (
          <a className={item === 'Inicio' ? 'active' : ''} href={`#${item.toLowerCase()}`} key={item}>
            {item}
          </a>
        ))}
      </div>
      <Button href="#contacto" variant="dark">Hablemos</Button>
    </nav>
  )
}
