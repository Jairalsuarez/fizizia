export function Icon({ name, className = '', size = 20 }) {
  return <span className={`material-symbols-rounded inline-block ${className}`} style={{ fontSize: size }}>{name}</span>;
}
