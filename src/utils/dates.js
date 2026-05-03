export function isOverdue(date) {
  if (!date) return false
  return new Date(date) < new Date()
}

export function daysUntil(date) {
  if (!date) return 0
  const diff = new Date(date) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatRelative(date) {
  if (!date) return ''
  const days = daysUntil(date)
  if (days < 0) return `Hace ${Math.abs(days)} días`
  if (days === 0) return 'Hoy'
  return `En ${days} días`
}
