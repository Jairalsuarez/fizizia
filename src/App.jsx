import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { CtaSection } from './components/landing/CtaSection'
import { HeroSection } from './components/landing/HeroSection'
import { ProcessSection } from './components/landing/ProcessSection'
import { ProjectsSection } from './components/landing/ProjectsSection'
import { ServicesSection } from './components/landing/ServicesSection'
import { TestimonialSection } from './components/landing/TestimonialSection'

function App() {
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
