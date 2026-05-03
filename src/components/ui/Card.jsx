export function Card({ children, className = '', onClick, hoverable = false }) {
  const base = 'bg-dark-900 border border-dark-700 rounded-xl p-6';
  const hover = hoverable ? 'hover:border-fizzia-400 hover:shadow-lg hover:shadow-fizzia-500/10 transition-all cursor-pointer' : '';
  return <div className={`${base} ${hover} ${className}`} onClick={onClick}>{children}</div>;
}
