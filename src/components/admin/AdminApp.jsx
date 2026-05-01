import { useEffect, useMemo, useState } from 'react'
import {
  createClient,
  createLandingProject,
  createProject,
  deleteLandingProject,
  getAdminOverview,
  getCurrentProfile,
  updateLandingProjectVisibility,
} from '../../services/adminData'
import { isSupabaseConfigured, supabase } from '../../services/supabaseClient'
import { getProjectPreviewUrl } from '../../utils/projectPreview'
import { Logo } from '../ui/Logo'
import { MaterialIcon } from '../ui/MaterialIcon'

const rememberedEmailKey = 'fizzia.admin.email'

const menuItems = [
  { id: 'dashboard', label: 'Resumen', icon: 'space_dashboard' },
  { id: 'clients', label: 'Clientes', icon: 'groups' },
  { id: 'projects', label: 'Proyectos', icon: 'deployed_code' },
  { id: 'landing', label: 'Landing', icon: 'public' },
  { id: 'leads', label: 'Leads', icon: 'forum' },
  { id: 'money', label: 'Finanzas', icon: 'payments' },
]

const emptyData = {
  leads: [],
  clients: [],
  projects: [],
  tasks: [],
  invoices: [],
  landingProjects: [],
}

function formatMoney(value, currency = 'USD') {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function Field({ label, children }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function AdminLogin({ onSession }) {
  const rememberedEmail = localStorage.getItem(rememberedEmailKey) || ''
  const [email, setEmail] = useState(rememberedEmail)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(Boolean(rememberedEmail))
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setIsLoading(false)

    if (signInError) {
      setError('No pude iniciar sesion con esos datos.')
      return
    }

    if (remember) {
      localStorage.setItem(rememberedEmailKey, email)
    } else {
      localStorage.removeItem(rememberedEmailKey)
    }

    onSession(data.session)
  }

  return (
    <main className="admin-auth">
      <section className="admin-login-shell">
        <div className="admin-login-brand">
          <img className="admin-login-mark-pulse" src="/images/logo-figura-transparent.png" alt="" />
          <Logo />
        </div>
        <form className="admin-login-card" onSubmit={handleSubmit}>
          <h2>Fizzia</h2>
          <Field label="Email">
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </Field>
          <Field label="Password">
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </Field>
          <label className="admin-check">
            <input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" />
            <span>Recordar email</span>
          </label>
          {error ? <p className="admin-error">{error}</p> : null}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}

function StatTile({ label, value, icon }) {
  return (
    <article className="admin-stat">
      <MaterialIcon name={icon} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function AdminDrawer({ activeSection, isOpen, onClose, onSelect, onSignOut }) {
  return (
    <>
      <button className={`admin-drawer-backdrop ${isOpen ? 'open' : ''}`} type="button" onClick={onClose} aria-label="Cerrar menu" />
      <aside className={`admin-drawer ${isOpen ? 'open' : ''}`}>
        <Logo />
        <nav>
          {menuItems.map((item) => (
            <button
              className={activeSection === item.id ? 'active' : ''}
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id)
                onClose()
              }}
            >
              <MaterialIcon name={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>
        <button className="admin-drawer-exit" type="button" onClick={onSignOut}>
          <MaterialIcon name="logout" />
          Cerrar sesion
        </button>
      </aside>
    </>
  )
}

function AdminPanel({ title, action, children }) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function DataList({ items, empty, renderItem }) {
  return (
    <div className="admin-list">
      {items.length ? items.map(renderItem) : <p className="admin-empty">{empty}</p>}
    </div>
  )
}

function ClientForm({ onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', province: '' })
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    await createClient(form)
    setForm({ name: '', email: '', phone: '', city: '', province: '' })
    setIsSaving(false)
    onCreated()
  }

  return (
    <form className="admin-inline-form" onSubmit={handleSubmit}>
      <Field label="Cliente">
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </Field>
      <Field label="Email">
        <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} type="email" />
      </Field>
      <Field label="Telefono">
        <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      </Field>
      <Field label="Ciudad">
        <input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
      </Field>
      <button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Crear cliente'}</button>
    </form>
  )
}

function ProjectForm({ clients, onCreated }) {
  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [status, setStatus] = useState('discovery')
  const [dueDate, setDueDate] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSaving(true)
    await createProject({
      client_id: selectedClientId || clients[0]?.id,
      name,
      budget,
      status,
      due_date: dueDate,
    })
    setName('')
    setBudget('')
    setStatus('discovery')
    setDueDate('')
    setSelectedClientId('')
    setIsSaving(false)
    onCreated()
  }

  if (!clients.length) {
    return <p className="admin-empty">Crea un cliente antes de abrir un proyecto.</p>
  }

  return (
    <form className="admin-inline-form" onSubmit={handleSubmit}>
      <Field label="Cliente">
        <select value={selectedClientId || clients[0]?.id} onChange={(event) => setSelectedClientId(event.target.value)}>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </Field>
      <Field label="Proyecto">
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <Field label="Presupuesto">
        <input value={budget} onChange={(event) => setBudget(event.target.value)} inputMode="decimal" />
      </Field>
      <Field label="Estado">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="discovery">Discovery</option>
          <option value="active">Activo</option>
          <option value="review">Revision</option>
          <option value="delivered">Entregado</option>
        </select>
      </Field>
      <Field label="Fecha entrega">
        <input value={dueDate} onChange={(event) => setDueDate(event.target.value)} type="date" />
      </Field>
      <button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Crear proyecto'}</button>
    </form>
  )
}

function LandingProjectForm({ onCreated }) {
  const [form, setForm] = useState({ website_url: '', title: '', industry: '', is_published: true, is_featured: false, sort_order: '10' })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      await createLandingProject(form)
      setForm({ website_url: '', title: '', industry: '', is_published: true, is_featured: false, sort_order: '10' })
      onCreated()
    } catch (submitError) {
      setError(submitError.message || 'No pude publicar ese proyecto.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="admin-inline-form" onSubmit={handleSubmit}>
      {form.website_url ? (
        <div className="admin-project-preview">
          <img src={getProjectPreviewUrl(form.website_url)} alt="Miniatura del proyecto" />
        </div>
      ) : null}
      <Field label="Link">
        <input
          value={form.website_url}
          onChange={(event) => setForm({ ...form, website_url: event.target.value })}
          placeholder="https://proyecto.com"
          required
          inputMode="url"
        />
      </Field>
      <Field label="Nombre">
        <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Opcional" />
      </Field>
      <Field label="Categoria">
        <input value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} />
      </Field>
      <div className="admin-switch-row">
        <label><input checked={form.is_published} onChange={(event) => setForm({ ...form, is_published: event.target.checked })} type="checkbox" /> Visible en landing</label>
        <label><input checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} type="checkbox" /> Destacado</label>
      </div>
      {error ? <p className="admin-error">{error}</p> : null}
      <button type="submit" disabled={isSaving}>
        <MaterialIcon name="add_link" />
        {isSaving ? 'Guardando...' : 'Publicar'}
      </button>
    </form>
  )
}

function DashboardView({ data }) {
  const activeProjects = data.projects.filter((project) => project.status === 'active').length
  const landingLive = data.landingProjects.filter((project) => project.is_published).length
  const pendingInvoices = data.invoices
    .filter((invoice) => !['paid', 'cancelled'].includes(invoice.status))
    .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0)

  return (
    <>
      <div className="admin-stats-grid">
        <StatTile label="Leads" value={data.leads.length} icon="forum" />
        <StatTile label="Activos" value={activeProjects || data.projects.length} icon="deployed_code" />
        <StatTile label="Por cobrar" value={formatMoney(pendingInvoices)} icon="payments" />
        <StatTile label="Landing" value={landingLive} icon="public" />
      </div>
      <AdminPanel title="Actividad reciente">
        <DataList
          items={data.projects.slice(0, 5)}
          empty="Todavia no hay proyectos."
          renderItem={(project) => (
            <article className="admin-row" key={project.id}>
              <div>
                <strong>{project.name}</strong>
                <span>{project.status} - {project.due_date || 'Sin fecha'}</span>
              </div>
              <b>{formatMoney(project.budget, project.currency)}</b>
            </article>
          )}
        />
      </AdminPanel>
    </>
  )
}

function AdminContent({ activeSection, data, refresh }) {
  if (activeSection === 'clients') {
    return (
      <>
        <AdminPanel title="Nuevo cliente"><ClientForm onCreated={refresh} /></AdminPanel>
        <AdminPanel title="Clientes">
          <DataList
            items={data.clients}
            empty="Todavia no hay clientes."
            renderItem={(client) => (
              <article className="admin-row" key={client.id}>
                <div>
                  <strong>{client.name}</strong>
                  <span>{client.city || 'Ecuador'} - {client.status}</span>
                </div>
              </article>
            )}
          />
        </AdminPanel>
      </>
    )
  }

  if (activeSection === 'projects') {
    return (
      <>
        <AdminPanel title="Nuevo proyecto"><ProjectForm clients={data.clients} onCreated={refresh} /></AdminPanel>
        <AdminPanel title="Proyectos internos">
          <DataList
            items={data.projects}
            empty="Agrega proyectos para gestionarlos aqui."
            renderItem={(project) => (
              <article className="admin-row" key={project.id}>
                <div>
                  <strong>{project.name}</strong>
                  <span>{project.status}</span>
                </div>
                <b>{formatMoney(project.budget, project.currency)}</b>
              </article>
            )}
          />
        </AdminPanel>
      </>
    )
  }

  if (activeSection === 'landing') {
    return (
      <>
        <AdminPanel title="Publicar proyecto en landing"><LandingProjectForm onCreated={refresh} /></AdminPanel>
        <AdminPanel title="Visibilidad en landing">
          <DataList
            items={data.landingProjects}
            empty="Crea proyectos para mostrarlos en la landing."
            renderItem={(project) => (
              <article className="admin-row landing-control" key={project.id}>
                {project.website_url ? (
                  <img className="admin-row-preview" src={getProjectPreviewUrl(project.website_url)} alt="" />
                ) : null}
                <div>
                  <strong>{project.title}</strong>
                  <span>{project.industry || 'Proyecto'} - {project.website_url || 'Sin link'}</span>
                </div>
                <div className="admin-row-actions">
                  <button
                    className={project.is_published ? 'active' : ''}
                    type="button"
                    onClick={async () => {
                      await updateLandingProjectVisibility(project.id, { is_published: !project.is_published })
                      refresh()
                    }}
                  >
                    <MaterialIcon name={project.is_published ? 'visibility' : 'visibility_off'} />
                  </button>
                  <button
                    className={project.is_featured ? 'active' : ''}
                    type="button"
                    onClick={async () => {
                      await updateLandingProjectVisibility(project.id, { is_featured: !project.is_featured })
                      refresh()
                    }}
                  >
                    <MaterialIcon name="star" />
                  </button>
                  <button
                    className="danger"
                    type="button"
                    onClick={async () => {
                      if (!window.confirm('Eliminar proyecto?')) return
                      await deleteLandingProject(project.id)
                      refresh()
                    }}
                    aria-label="Eliminar proyecto"
                  >
                    <MaterialIcon name="delete" />
                  </button>
                </div>
              </article>
            )}
          />
        </AdminPanel>
      </>
    )
  }

  if (activeSection === 'leads') {
    return (
      <AdminPanel title="Leads">
        <DataList
          items={data.leads}
          empty="Los contactos de la landing apareceran aqui."
          renderItem={(lead) => (
            <article className="admin-row" key={lead.id}>
              <div>
                <strong>{lead.company_name || lead.full_name}</strong>
                <span>{lead.status} - {lead.budget_range || 'Sin presupuesto'}</span>
              </div>
            </article>
          )}
        />
      </AdminPanel>
    )
  }

  if (activeSection === 'money') {
    return (
      <AdminPanel title="Facturas">
        <DataList
          items={data.invoices}
          empty="Todavia no hay facturas."
          renderItem={(invoice) => (
            <article className="admin-row" key={invoice.id}>
              <div>
                <strong>{invoice.invoice_number}</strong>
                <span>{invoice.status} - {invoice.due_at || 'Sin vencimiento'}</span>
              </div>
              <b>{formatMoney(invoice.total, invoice.currency)}</b>
            </article>
          )}
        />
      </AdminPanel>
    )
  }

  return <DashboardView data={data} />
}

export function AdminApp() {
  const hasSupabase = isSupabaseConfigured()
  const [session, setSession] = useState(null)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [data, setData] = useState(emptyData)
  const [isLoading, setIsLoading] = useState(hasSupabase)
  const [profile, setProfile] = useState(null)

  const userName = useMemo(() => {
    const email = session?.user?.email || ''
    return email.split('@')[0] || 'Admin'
  }, [session])

  async function refresh() {
    const overview = await getAdminOverview()
    setData(overview)
  }

  useEffect(() => {
    if (!hasSupabase) return

    supabase.auth.getSession().then(({ data: sessionData }) => {
      setSession(sessionData.session)
      setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [hasSupabase])

  useEffect(() => {
    if (!session) return

    Promise.all([getAdminOverview(), getCurrentProfile()]).then(([overview, currentProfile]) => {
      setData(overview)
      setProfile(currentProfile)
    })
  }, [session])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (!hasSupabase) {
    return (
      <main className="admin-auth">
        <section className="admin-login-shell">
          <div className="admin-login-brand">
            <Logo />
            <h1>Configura Supabase.</h1>
          </div>
        </section>
      </main>
    )
  }

  if (isLoading) return <main className="admin-loading">Cargando Fizzia...</main>

  if (!session) return <AdminLogin onSession={setSession} />

  return (
    <main className="admin-app">
      <AdminDrawer
        activeSection={activeSection}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelect={setActiveSection}
        onSignOut={handleSignOut}
      />
      <header className="admin-topbar">
        <button type="button" onClick={() => setIsDrawerOpen(true)} aria-label="Abrir menu">
          <MaterialIcon name="menu" />
        </button>
        <Logo />
        <button type="button" onClick={refresh} aria-label="Actualizar">
          <MaterialIcon name="sync" />
        </button>
      </header>

      <section className="admin-hero">
        <span>Hola, {userName}</span>
        <h1>{menuItems.find((item) => item.id === activeSection)?.label}</h1>
      </section>

      {profile && !['admin', 'manager'].includes(profile.role) ? (
        <p className="admin-permission-alert">
          Tu usuario esta autenticado, pero no tiene permisos admin en Supabase.
        </p>
      ) : null}

      <AdminContent activeSection={activeSection} data={data} refresh={refresh} />
    </main>
  )
}

