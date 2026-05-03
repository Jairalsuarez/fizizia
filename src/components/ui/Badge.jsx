export function Badge({ children, variant = 'neutral' }) {
  const variants = {
    neutral: 'bg-dark-800 text-dark-300',
    success: 'bg-fizzia-500/20 text-fizzia-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    danger: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400'
  };
  return <span className={`${variants[variant]} px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block`}>{children}</span>;
}
