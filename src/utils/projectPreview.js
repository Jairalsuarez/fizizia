export function getProjectPreviewUrl(websiteUrl) {
  if (!websiteUrl) return ''

  const normalizedUrl = /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(normalizedUrl)}?w=900`
}
