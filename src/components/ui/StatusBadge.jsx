import { Badge } from './Badge';

const statusMap = {
  active: 'success', won: 'success', paid: 'success', done: 'success', entregado: 'success',
  pending: 'warning', solicitado: 'warning', preparing: 'warning', quoted: 'warning', sent: 'warning', preparando: 'warning',
  blocked: 'danger', overdue: 'danger',
  cancelled: 'neutral', lost: 'neutral', void: 'neutral', cancelado: 'neutral',
  new: 'info', contacted: 'info', qualified: 'info', proposal_sent: 'info', review: 'info', trabajando: 'info', pausado: 'warning',
};

const labels = {
  solicitado: 'Solicitado', preparando: 'Preparando', trabajando: 'Trabajando',
  pausado: 'Pausado', entregado: 'Entregado', cancelado: 'Cancelado',
};

export function StatusBadge({ status }) {
  return <Badge variant={statusMap[status] || 'neutral'}>{labels[status] || status?.replace(/_/g, ' ')}</Badge>;
}
