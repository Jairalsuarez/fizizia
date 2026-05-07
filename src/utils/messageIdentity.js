const STAFF_AVATAR_FALLBACK = '16'
const CLIENT_AVATAR_FALLBACK = '2'
const USER_AVATAR_FALLBACK = '1'

export function getMessageAuthor(message, authors = {}) {
  return message?.sender_id ? authors[message.sender_id] : null
}

export function getMessageAuthorName({ message, isMine, author, ownLabel = 'Tu', clientName = 'Cliente' }) {
  if (isMine) return ownLabel
  if (message?.is_admin_sender) return author?.full_name || author?.first_name || 'Fizzia'
  return author?.full_name || author?.first_name || clientName
}

export function getMessageAvatarId({ message, isMine, author, currentUser }) {
  if (isMine) return currentUser?.avatar_id || USER_AVATAR_FALLBACK
  if (author?.avatar_id) return author.avatar_id
  return message?.is_admin_sender ? STAFF_AVATAR_FALLBACK : CLIENT_AVATAR_FALLBACK
}
