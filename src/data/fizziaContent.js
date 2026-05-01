const imageBase = '/images/'

export const robots = {
  hero: `${imageBase}robot-saludo-transparent.png`,
  laptop: `${imageBase}robot-laptop-transparent.png`,
  wave: `${imageBase}robot-saludo-transparent.png`,
  logo: `${imageBase}AGILIZANDO TU VIDA DIGITAL POR TI..png`,
  icon: `${imageBase}ChatGPT Image 28 abr 2026, 12_35_49 a.m. (1).png`,
  poses: {
    inicio: `${imageBase}robot-saludo-transparent.png`,
    servicios: `${imageBase}robot-laptop-transparent.png`,
    proyectos: `${imageBase}ChatGPT Image 28 abr 2026, 12_35_50 a.m. (4).png`,
    proceso: `${imageBase}ChatGPT Image 28 abr 2026, 12_35_51 a.m. (6).png`,
    contacto: `${imageBase}ChatGPT Image 28 abr 2026, 12_35_52 a.m. (7).png`,
  }
}

export const services = [
  {
    title: 'Sistemas Web',
    text: 'Plataformas a medida para gestionar y automatizar tu negocio.',
    icon: 'code_blocks',
  },
  {
    title: 'Aplicaciones Móviles',
    text: 'Apps personalizadas para Android y iOS que conectan con tus usuarios.',
    icon: 'phone_iphone',
  },
  {
    title: 'Tiendas Online',
    text: 'E-commerce modernos, seguros y listos para vender.',
    icon: 'shopping_cart',
  },
  {
    title: 'Gestión de Inventarios',
    text: 'Control total de tus productos, stock y movimientos.',
    icon: 'inventory_2',
  },
  {
    title: 'Sistemas de Ventas',
    text: 'Facturación, clientes, reportes y más. Todo en un solo lugar.',
    icon: 'monitoring',
  },
  {
    title: 'Invitaciones de bodas',
    text: 'Invitaciones digitales interactivas para tu gran día.',
    icon: 'favorite',
  },
]

export const processSteps = [
  {
    title: 'Hablamos',
    text: 'Cuéntame tu idea y entendemos tu objetivo.',
    icon: 'forum',
  },
  {
    title: 'Planificamos',
    text: 'Definimos el alcance, tecnología y tiempos.',
    icon: 'groups',
  },
  {
    title: 'Desarrollamos',
    text: 'Creamos tu solución con calidad y enfoque.',
    icon: 'draw',
  },
  {
    title: 'Entregamos',
    text: 'Probamos, lanzamos y te acompañamos.',
    icon: 'deployed_code',
  },
]

export const dashboardStats = [
  { label: 'Leads nuevos', value: '18', note: 'desde landing' },
  { label: 'Proyectos activos', value: '6', note: 'web, apps y marca' },
  { label: 'Propuestas enviadas', value: '$8.4k', note: 'pipeline estimado' },
  { label: 'Tareas abiertas', value: '42', note: 'equipo Fizzia' },
]

export const pipelineLeads = [
  { name: 'Restaurante Quito', service: 'Landing + reservas', status: 'Calificado', value: '$850' },
  { name: 'Tienda Guayaquil', service: 'App de pedidos', status: 'Propuesta', value: '$2.400' },
  { name: 'Clinica Cuenca', service: 'Sistema de citas', status: 'En llamada', value: '$1.800' },
]

export const fallbackProjects = [
  {
    id: 'zaphiro',
    title: 'Zaphiro Studio',
    summary: 'Portafolio profesional con reservas y catálogo digital.',
    industry: 'Servicios',
  },
  {
    id: 'fizzia-dashboard',
    title: 'Dashboard Comercial',
    summary: 'Panel de ventas, clientes y métricas para toma de decisiones.',
    industry: 'SaaS',
  },
  {
    id: 'sabores',
    title: 'Sabores que encantan',
    summary: 'Landing y menú digital para restaurante con enfoque en conversión.',
    industry: 'Gastronomía',
  },
]

export const navItems = ['Inicio', 'Servicios', 'Proyectos', 'Proceso', 'Contacto']

export const heroBenefits = [
  { label: 'A medida', icon: 'auto_awesome' },
  { label: 'Escalable', icon: 'query_stats' },
  { label: 'Moderno', icon: 'verified_user' },
  { label: 'Seguro', icon: 'security' },
]

export const socialLinks = ['ig', 'in', 'gh', 'wa']

export const footerServices = [
  'Sistemas Web',
  'Apps Móviles',
  'Tiendas Online',
  'Inventarios',
  'Sistemas de Ventas',
  'Invitaciones de bodas',
]
