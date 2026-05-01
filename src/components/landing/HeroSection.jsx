import { heroBenefits, robots } from '../../data/fizziaContent'
import { Button } from '../ui/Button'
import { MaterialIcon } from '../ui/MaterialIcon'

export function HeroSection() {
  return (
    <div id="inicio" className="hero-layout">
      <div className="hero-copy">
        <h1>
          No busques más, <span>Tu idea</span> tiene una solución digital.
        </h1>
        <p>Desarrollo sistemas, aplicaciones y experiencias digitales a la medida de tus necesidades.</p>
        <div className="hero-actions">
          <Button href="#proyectos" size="large">Ver proyectos</Button>
          <Button href="#servicios" variant="secondary" size="large">Mis Servicios</Button>
        </div>
        <div className="hero-benefits">
          {heroBenefits.map((benefit) => (
            <div className="benefit-item" key={benefit.label}>
              <MaterialIcon name={benefit.icon} />
              {benefit.label}
            </div>
          ))}
        </div>
      </div>

      <div className="hero-visual" aria-label="Vista previa de dashboard Fizzia">
        <div className="dashboard-mock" role="img" aria-label="Dashboard de analisis de ventas de Fizzia">
          <div className="mock-sidebar">
            <strong>Fizzia</strong>
            <span><MaterialIcon name="home" />Inicio</span>
            <span><MaterialIcon name="receipt_long" />Ventas</span>
            <span><MaterialIcon name="inventory_2" />Productos</span>
            <span><MaterialIcon name="groups" />Clientes</span>
          </div>
          <div className="mock-content">
            <div className="mock-topbar">
              <strong>Dashboard</strong>
              <span>Hoy</span>
            </div>
            <small>Ventas del mes</small>
            <b>$24,780.00</b>
            <div className="mock-chart">
              <svg viewBox="0 0 340 120" aria-hidden="true">
                <path d="M6 92 C35 86 48 66 74 72 C102 78 111 40 138 50 C166 60 176 84 202 62 C228 40 236 28 264 45 C288 60 304 20 334 22" />
              </svg>
            </div>
            <div className="mock-grid">
              <span><b>1,248</b><small>Pedidos</small></span>
              <span><b>$12,430</b><small>Ingresos</small></span>
              <span><b>320</b><small>Clientes</small></span>
              <span><b>85%</b><small>Meta</small></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
