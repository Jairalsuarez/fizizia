import { Badge } from './Badge';

const statusMap = {
  active: 'success', won: 'success', paid: 'success', done: 'success', delivered: 'success',
  pending: 'warning', discovery: 'warning', quoted: 'warning', sent: 'warning',
  blocked: 'danger', overdue: 'danger',
  cancelled: 'neutral', lost: 'neutral', void: 'neutral',
  new: 'info', contacted: 'info', qualified: 'info', proposal_sent: 'info', review: 'info'
};

export function StatusBadge({ status }) {
  return <Badge variant={statusMap[status] || 'neutral'}>{status?.replace(/_/g, ' ')}</Badge>;
}
