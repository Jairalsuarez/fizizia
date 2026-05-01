import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { AdminApp } from './components/admin/AdminApp'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { CtaSection } from './components/landing/CtaSection'
import { HeroSection } from './components/landing/HeroSection'
import { ProcessSection } from './components/landing/ProcessSection'
import { ProjectsSection } from './components/landing/ProjectsSection'
import { ServicesSection } from './components/landing/ServicesSection'
import { TestimonialSection } from './components/landing/TestimonialSection'

function App() {
  const [hash, setHash] = useState(window.location.hash)
  const isNativeApp = Capacitor.isNativePlatform()

  useEffect(() => {
    function handleHashChange() {
      setHash(window.location.hash)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  if (isNativeApp || hash === '#/admin' || hash === '#/login') {
    return <AdminApp />
  }

  return (
    <main>
      <Header />
      <section className="hero-section">
        <HeroSection />
      </section>
      <ServicesSection />
      <ProjectsSection />
      <ProcessSection />
      <TestimonialSection />
      <CtaSection />
      <Footer />
    </main>
  )
}

export default App
