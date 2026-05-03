export function buildMetrics(data) {
  const paymentsTotal = (data.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0)
  const expensesTotal = (data.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0)
  const invoicesPaid = (data.invoices || [])
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total_amount || 0), 0)
  const invoicesReceivable = (data.invoices || [])
    .filter(i => ['sent', 'quoted'].includes(i.status))
    .reduce((sum, i) => sum + (i.total_amount || 0), 0)

  return {
    balance: paymentsTotal - expensesTotal,
    revenue: invoicesPaid,
    receivable: invoicesReceivable,
    activeClients: (data.clients || []).filter(c => c.status === 'active').length
  }
}

export function buildProjectSummaries(data) {
  return (data.projects || []).map(project => {
    const projectPayments = (data.payments || []).filter(p => p.project_id === project.id)
    const totalPaid = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const pending = (project.budget || 0) - totalPaid
    return {
      ...project,
      total_paid: totalPaid,
      pending_amount: pending > 0 ? pending : 0
    }
  })
}

export function enrichCharges(data) {
  return (data.invoices || []).map(invoice => {
    const client = (data.clients || []).find(c => c.id === invoice.client_id)
    const project = (data.projects || []).find(p => p.id === invoice.project_id)
    const invoicePayments = (data.payments || []).filter(p => p.invoice_id === invoice.id)
    const paidAmount = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    return {
      ...invoice,
      client_name: client?.full_name || 'Sin cliente',
      project_name: project?.name || 'Sin proyecto',
      paid_amount: paidAmount
    }
  })
}

export function buildMovements(data) {
  const payments = (data.payments || []).map(p => ({
    ...p,
    type: 'payment',
    date: p.payment_date || p.created_at
  }))
  const expenses = (data.expenses || []).map(e => ({
    ...e,
    type: 'expense',
    date: e.expense_date || e.created_at
  }))

  return [...payments, ...expenses].sort((a, b) => new Date(b.date) - new Date(a.date))
}
