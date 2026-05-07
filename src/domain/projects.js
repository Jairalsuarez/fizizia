export const PROJECT_STATUS = {
  REQUESTED: 'solicitado',
  PREPARING: 'preparando',
  WORKING: 'trabajando',
  PAUSED: 'pausado',
  DELIVERED: 'entregado',
  CANCELED: 'cancelado',
}

export const projectStatusLabels = {
  [PROJECT_STATUS.REQUESTED]: 'Solicitado',
  [PROJECT_STATUS.PREPARING]: 'Preparando',
  [PROJECT_STATUS.WORKING]: 'Trabajando',
  [PROJECT_STATUS.PAUSED]: 'Pausado',
  [PROJECT_STATUS.DELIVERED]: 'Entregado',
  [PROJECT_STATUS.CANCELED]: 'Cancelado',
}

export const projectStatusColors = {
  [PROJECT_STATUS.REQUESTED]: 'bg-fizzia-500',
  [PROJECT_STATUS.PREPARING]: 'bg-purple-500',
  [PROJECT_STATUS.WORKING]: 'bg-blue-500',
  [PROJECT_STATUS.PAUSED]: 'bg-yellow-500',
  [PROJECT_STATUS.DELIVERED]: 'bg-green-500',
  [PROJECT_STATUS.CANCELED]: 'bg-red-500',
}

export const projectStatusTone = {
  [PROJECT_STATUS.REQUESTED]: 'bg-fizzia-500/20 text-fizzia-400',
  [PROJECT_STATUS.PREPARING]: 'bg-purple-500/20 text-purple-400',
  [PROJECT_STATUS.WORKING]: 'bg-blue-500/20 text-blue-400',
  [PROJECT_STATUS.PAUSED]: 'bg-yellow-500/20 text-yellow-400',
  [PROJECT_STATUS.DELIVERED]: 'bg-green-500/20 text-green-400',
  [PROJECT_STATUS.CANCELED]: 'bg-red-500/20 text-red-400',
}

export const adminProjectStatusOptions = [
  PROJECT_STATUS.PREPARING,
  PROJECT_STATUS.WORKING,
  PROJECT_STATUS.PAUSED,
  PROJECT_STATUS.DELIVERED,
]

export function getProjectStatusLabel(status) {
  return projectStatusLabels[status] || status || 'Sin estado'
}

export function getProjectStatusColor(status) {
  return projectStatusColors[status] || 'bg-dark-700'
}

export function getProjectStatusTone(status) {
  return projectStatusTone[status] || 'bg-dark-700 text-dark-400'
}

export function isProjectClosed(status) {
  return [PROJECT_STATUS.DELIVERED, PROJECT_STATUS.CANCELED].includes(status)
}
