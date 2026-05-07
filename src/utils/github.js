export function parseGitHubUrl(url) {
  if (!url) return null
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

export async function fetchGitHubCommits(repoUrl, limit = 20) {
  const repo = parseGitHubUrl(repoUrl)
  if (!repo) return []

  try {
    const token = import.meta.env.VITE_GITHUB_TOKEN
    const res = await fetch(
      `https://api.github.com/repos/${repo.owner}/${repo.repo}/commits?per_page=${limit}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function fetchGitHubPullRequests(repoUrl) {
  const repo = parseGitHubUrl(repoUrl)
  if (!repo) return []

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo.owner}/${repo.repo}/pulls?state=all&per_page=10`
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export function getCommitDate(commit) {
  return commit?.commit?.author?.date || commit?.commit?.committer?.date
}

export function getCommitAuthorName(commit) {
  return commit?.author?.login || commit?.committer?.login || commit?.commit?.author?.name || commit?.commit?.committer?.name || 'GitHub'
}

export function formatCommitTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffH < 1) return 'Hace menos de 1 hora'
  if (diffH < 24) return `Hace ${diffH} hora${diffH > 1 ? 's' : ''}`
  if (diffD < 7) return `Hace ${diffD} día${diffD > 1 ? 's' : ''}`
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}
