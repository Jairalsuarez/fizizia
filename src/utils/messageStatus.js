const PENDING_WINDOW_MS = 15000

function messageTime(value) {
  const time = value ? new Date(value).getTime() : Date.now()
  return Number.isFinite(time) ? time : Date.now()
}

function isMatchingPendingMessage(message, incoming) {
  if (message._status !== 'sending') return false
  if (message.project_id && incoming.project_id && message.project_id !== incoming.project_id) return false
  if (message.sender_id && incoming.sender_id && message.sender_id !== incoming.sender_id) return false
  if ((message.content || '').trim() !== (incoming.content || '').trim()) return false
  return Math.abs(messageTime(message.created_at) - messageTime(incoming.created_at)) <= PENDING_WINDOW_MS
}

export function mergeRealtimeMessage(messages, incoming) {
  if (!incoming?.id) return messages
  if (messages.some(message => message.id === incoming.id)) {
    return messages.map(message => (
      message.id === incoming.id ? { ...message, ...incoming, _status: message._status === 'sending' ? 'sent' : message._status } : message
    ))
  }

  const pendingIndex = messages.findIndex(message => isMatchingPendingMessage(message, incoming))
  if (pendingIndex === -1) return [...messages, incoming]

  const next = [...messages]
  next[pendingIndex] = { ...next[pendingIndex], ...incoming, _status: 'sent' }
  return next
}

export function mergeRealtimeMessages(messages, incomingMessages = []) {
  return incomingMessages.reduce((next, message) => mergeRealtimeMessage(next, message), messages)
}

export function markMessageSent(messages, tempId, sentMessage) {
  if (!sentMessage?.id) {
    return messages.map(message => (
      message.id === tempId ? { ...message, _status: 'sent' } : message
    ))
  }

  const existingIndex = messages.findIndex(message => message.id === sentMessage.id)
  const tempIndex = messages.findIndex(message => message.id === tempId)

  if (existingIndex !== -1 && tempIndex !== -1 && existingIndex !== tempIndex) {
    return messages
      .filter(message => message.id !== tempId)
      .map(message => (
        message.id === sentMessage.id ? { ...message, ...sentMessage, _status: 'sent' } : message
      ))
  }

  return messages.map(message => (
    message.id === tempId ? { ...message, ...sentMessage, _status: 'sent' } : message
  ))
}

export function markMessageFailed(messages, tempId) {
  return messages.map(message => (
    message.id === tempId ? { ...message, _status: 'error' } : message
  ))
}

export function getDeliveryStatus(message, ownMessage) {
  if (!ownMessage) return null
  if (message._status === 'sending') return 'sending'
  if (message._status === 'error') return 'error'
  if (message.read_at) return 'read'
  return 'sent'
}
