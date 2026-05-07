export function readStoredValue(key, fallback, validate = null) {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(key)
    if (stored === null) return fallback
    return validate && !validate(stored) ? fallback : stored
  } catch {
    return fallback
  }
}

export function writeStoredValue(key, value) {
  if (typeof window === 'undefined') return
  try {
    if (value === undefined || value === null || value === '') window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, String(value))
  } catch {
    // Storage can be unavailable in private or embedded contexts.
  }
}
