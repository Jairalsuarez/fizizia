export function SectionKicker({ children, tone = 'light' }) {
  return <p className={`section-kicker ${tone === 'dark' ? 'dark' : ''}`}>{children}</p>
}
