import { useState, useEffect } from 'react'
import { Card, StatusBadge, Icon, Badge, EmptyState, Skeleton } from '../../components/ui/'
import { getMyProfile, getMyClient, getMyProjects, getMyInvoices } from '../../services/clientData'
import { formatMoney, formatDate } from '../../utils/format'

export function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [profileRes, clientRes, projectsRes, invoicesRes] = await Promise.all([
          getMyProfile(),
          getMyClient(),
          getMyProjects(),
          getMyInvoices()
        ])
        setProfile(profileRes)
        setClient(clientRes)
        setProjects(projectsRes || [])
        setInvoices(invoicesRes || [])
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  if (!client && !profile) {
    return (
      <div className="p-6">
        <EmptyState
          title="Bienvenido a Fizzia"
          description="Tu perfil se está configurando. Contacta a soporte si necesitas ayuda."
          icon="user"
        />
      </div>
    )
  }

  const activeProject = projects.find(p => p.status === 'active' || p.status === 'doing')
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending' || inv.status === 'sent')
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue')
  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0)

  const nextMilestone = activeProject?.milestones?.find(m => m.status !== 'done')

  const recentActivity = [
    ...projects.slice(0, 3).map(p => ({ type: 'project', ...p, date: p.updated_at })),
    ...invoices.slice(0, 3).map(i => ({ type: 'invoice', ...i, date: i.issued_at }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {profile?.full_name || client?.name || 'Client'}
        </h1>
        <p className="text-dark-400 mt-1">
          Here's what's happening with your projects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-dark-900 border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Active Project</p>
              <p className="text-white text-xl font-semibold mt-1">
                {activeProject ? activeProject.name : 'No active project'}
              </p>
            </div>
            <Icon name="folder" className="w-8 h-8 text-primary-500" />
          </div>
          {activeProject && (
            <StatusBadge status={activeProject.status} className="mt-3" />
          )}
        </Card>

        <Card className="p-6 bg-dark-900 border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Next Milestone</p>
              <p className="text-white text-xl font-semibold mt-1">
                {nextMilestone ? nextMilestone.title : 'No upcoming'}
              </p>
            </div>
            <Icon name="flag" className="w-8 h-8 text-yellow-500" />
          </div>
          {nextMilestone && (
            <StatusBadge status={nextMilestone.status} className="mt-3" />
          )}
        </Card>

        <Card className="p-6 bg-dark-900 border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Pending Invoices</p>
              <p className="text-white text-xl font-semibold mt-1">
                {pendingInvoices.length + overdueInvoices.length}
              </p>
            </div>
            <Icon name="document" className="w-8 h-8 text-orange-500" />
          </div>
          {overdueInvoices.length > 0 && (
            <Badge variant="danger" className="mt-3">{overdueInvoices.length} overdue</Badge>
          )}
        </Card>

        <Card className="p-6 bg-dark-900 border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">Total Paid</p>
              <p className="text-white text-xl font-semibold mt-1">
                {formatMoney(totalPaid)}
              </p>
            </div>
            <Icon name="currency" className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      <Card className="bg-dark-900 border-dark-700">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((item, index) => (
                <div key={index} className="flex items-start space-x-3 pb-4 border-b border-dark-700 last:border-0">
                  <Icon
                    name={item.type === 'project' ? 'folder' : 'document'}
                    className="w-5 h-5 text-dark-400 mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm">
                      {item.type === 'project' ? (
                        <>Project <span className="font-medium">{item.name}</span> updated</>
                      ) : (
                        <>Invoice <span className="font-medium">{item.invoice_number}</span> issued</>
                      )}
                    </p>
                    <p className="text-dark-400 text-xs mt-1">
                      {formatDate(item.date)}
                    </p>
                  </div>
                  {item.type === 'project' ? (
                    <StatusBadge status={item.status} />
                  ) : (
                    <StatusBadge status={item.status} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Recent Activity"
              description="Activity will appear here as your projects progress"
              icon="activity"
            />
          )}
        </div>
      </Card>
    </div>
  )
}
