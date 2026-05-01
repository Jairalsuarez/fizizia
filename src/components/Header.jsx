import { useEffect, useState, useRef } from 'react'
import { navItems } from '../data/fizziaContent'
import { Button } from './ui/Button'
import { Logo } from './ui/Logo'

export function Header() {
  const [activeSection, setActiveSection] = useState('inicio')
  const navRef = useRef(null)

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '-80px 0px -40% 0px',
      threshold: 0.1
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }, options)

    const sections = document.querySelectorAll('section[id], [id="inicio"]')
    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  const handleNavClick = (e, id) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (!target) return

    const navHeight = navRef.current ? navRef.current.offsetHeight : 80
    const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight
    
    window.scrollTo({
      top: targetTop,
      behavior: 'smooth'
    })
    setActiveSection(id)
  }

  return (
    <nav className="site-nav" ref={navRef}>
      <Logo />
      <div className="nav-links">
        {navItems.map((item) => {
          const id = item.toLowerCase()
          return (
            <a 
              className={activeSection === id ? 'active' : ''} 
              href={`#${id}`} 
              key={item}
              onClick={(e) => handleNavClick(e, id)}
            >
              {item}
            </a>
          )
        })}
      </div>
      <Button 
        variant="dark" 
        onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('open-chatbot')); }}
      >
        Hablemos
      </Button>
    </nav>
  )
}
