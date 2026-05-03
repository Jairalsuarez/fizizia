import { Header } from '../components/landing/Header'
import { Footer } from '../components/landing/Footer'
import { HeroSection } from '../components/landing/HeroSection'
import { ServicesSection } from '../components/landing/ServicesSection'
import { ProjectsSection } from '../components/landing/ProjectsSection'
import { TrustSection } from '../components/landing/TrustSection'
import { PortalSection } from '../components/landing/PortalSection'
import { ProcessSection } from '../components/landing/ProcessSection'
import { NewsletterSection } from '../components/landing/NewsletterSection'
import { ContactSection } from '../components/landing/ContactSection'
import { ChatWidget } from '../components/landing/ChatWidget'

export function LandingPage() {
  return (
    <div className="bg-dark-950">
      <Header />
      <HeroSection />
      <ServicesSection />
      <ProjectsSection />
      <TrustSection />
      <PortalSection />
      <ProcessSection />
      <NewsletterSection />
      <ContactSection />
      <Footer />
      <ChatWidget />
    </div>
  )
}
