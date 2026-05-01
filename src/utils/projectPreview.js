export function getProjectPreviewUrl(websiteUrl) {
  if (!websiteUrl) return ''

  const normalizedUrl = /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(normalizedUrl)}?w=900`
}

export function getPlaceholderUrl(index) {
  const placeholders = [
    '/images/placeholders/placeholder_1.png',
    '/images/placeholders/placeholder_2.png',
    '/images/placeholders/placeholder_3.png'
  ];
  return placeholders[index % placeholders.length];
}
