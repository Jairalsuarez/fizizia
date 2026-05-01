import { dashboardStats, pipelineLeads } from '../../data/fizziaContent'
import { SectionKicker } from '../ui/SectionKicker'

function StatCard({ stat }) {
  return (
    <div className="stat-card">
      <span>{stat.label}</span>
      <strong>{stat.value}</strong>
      <small>{stat.note}</small>
    </div>
  )
}

function PipelineTable({ leads }) {
  return (
    <div className="pipeline-table">
      <div className="table-head">
        <span>Cliente potencial</span>
        <span>Servicio</span>
        <span>Estado</span>
        <span>Valor</span>
      </div>
      {leads.map((lead) => (
        <div className="table-row" key={lead.name}>
          <strong>{lead.name}</strong>
          <span>{lead.service}</span>
          <span>{lead.status}</span>
          <span>{lead.value}</span>
        </div>
      ))}
    </div>
  )
}

export function DashboardPreview() {
  return (
    <section id="panel" className="content-band bg-[#eef6e3] text-[#101510]">
      <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <SectionKicker tone="dark">App interna</SectionKicker>
            <h2 className="mt-4 text-4xl font-black leading-tight lg:text-5xl">
              Control para clientes, proyectos y dinero.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-[#465141]">
            Esta vista nace del SQL que ya cargaste en Supabase: leads, clientes, proyectos, tareas, propuestas, facturas y archivos.
          </p>
        </div>

        <div className="dashboard-shell">
          <aside className="dashboard-sidebar">
            <strong>Fizzia</strong>
            <span>Leads</span>
            <span>Clientes</span>
            <span>Proyectos</span>
            <span>Finanzas</span>
          </aside>
          <div className="dashboard-main">
            <div className="stats-grid">
              {dashboardStats.map((stat) => (
                <StatCard key={stat.label} stat={stat} />
              ))}
            </div>
            <PipelineTable leads={pipelineLeads} />
          </div>
        </div>
      </div>
    </section>
  )
}
