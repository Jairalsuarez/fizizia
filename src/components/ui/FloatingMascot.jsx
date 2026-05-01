import { useState, useEffect } from 'react'
import { robots } from '../../data/fizziaContent'

export function FloatingMascot({ isHiddenByChat }) {
  const [currentPose, setCurrentPose] = useState('inicio')
  const [isVisibleByScroll, setIsVisibleByScroll] = useState(true)

  const isVisible = isVisibleByScroll && !isHiddenByChat

  const poseConfigs = {
    inicio: { right: '10%', top: '45%', scale: 1, rotate: '-5deg', side: 'right' },
    servicios: { right: 'auto', left: '5%', top: '35%', scale: 1.3, rotate: '10deg', side: 'left' },
    proyectos: { right: '5%', left: 'auto', top: '70%', scale: 0.9, rotate: '-10deg', side: 'right' },
    proceso: { right: 'auto', left: '8%', top: '55%', scale: 1.1, rotate: '5deg', side: 'left' },
    contacto: { right: '12%', left: 'auto', top: '25%', scale: 1.4, rotate: '-8deg', side: 'right' },
  }

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight
      
      const sections = ['inicio', 'servicios', 'proyectos', 'proceso', 'contacto']
      let found = 'inicio'
      
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top < windowHeight * 0.6 && rect.bottom > windowHeight * 0.4) {
            found = sectionId
            break
          }
        }
      }
      
      if (found !== currentPose) {
        setCurrentPose(found)
      }

      // Hide at the very bottom
      if (scrollY > docHeight - windowHeight - 150) {
        setIsVisibleByScroll(false)
      } else {
        setIsVisibleByScroll(true)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [currentPose])

  const config = poseConfigs[currentPose]
  const messages = {
    inicio: "¡Hola! Soy tu guía Fizzia.",
    servicios: "¿Qué podemos construir hoy?",
    proyectos: "Calidad que puedes ver.",
    proceso: "Paso a paso, sin fallos.",
    contacto: "¡Tu idea empieza aquí!",
  }

  return (
    <div 
      className={`floating-mascot-guide ${isVisible ? 'visible' : ''} side-${config.side}`}
      style={{ 
        '--m-right': config.right,
        '--m-left': config.left,
        '--m-top': config.top,
        '--m-scale': config.scale,
        '--m-rotate': config.rotate,
      }}
    >
      <div className="mascot-speech-bubble">
        {messages[currentPose]}
      </div>
      <div className="mascot-wrapper">
        <img 
          src={robots.poses[currentPose]} 
          alt="Guía Fizzia" 
          className="mascot-image-pose"
        />
      </div>
    </div>
  )
}
