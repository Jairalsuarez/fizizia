export function formatMoney(amount) {
  if (amount == null || isNaN(amount)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function formatShortDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short'
  })
}
