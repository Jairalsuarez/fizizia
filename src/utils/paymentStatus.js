export function isApprovedPayment(payment) {
  return payment?.admin_status === 'approved' || payment?.status === 'approved'
}

export function isPendingPayment(payment) {
  return !payment?.admin_status || payment.admin_status === 'pending'
}

export function sumApprovedPayments(payments = []) {
  return payments
    .filter(isApprovedPayment)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
}

export function getAcceptedInvoiceTotal(invoice) {
  if (!invoice?.payments?.length) return invoice?.status === 'paid' ? Number(invoice.total || 0) : 0
  return sumApprovedPayments(invoice.payments)
}
