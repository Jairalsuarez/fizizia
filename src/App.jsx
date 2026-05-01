import { useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { ContactSection } from './components/landing/ContactSection'
import { HeroSection } from './components/landing/HeroSection'
import { ProcessSection } from './components/landing/ProcessSection'
import { ProjectsSection } from './components/landing/ProjectsSection'
import { ServicesSection } from './components/landing/ServicesSection'
import { ChatWidget } from './components/ui/ChatWidget'
import { FloatingMascot } from './components/ui/FloatingMascot'

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <main>
      <ChatWidget onToggle={setIsChatOpen} />
      <FloatingMascot isHiddenByChat={isChatOpen} />
      <Header />
      <section className="hero-section">
        <HeroSection />
      </section>
      <ServicesSection />
      <ProjectsSection />
      <ProcessSection />
      <ContactSection />
      <Footer />
    </main>
  )
}

export default App
