import { Icon } from './Icon'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  icon,
  disabled,
  className = '',
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 cursor-pointer select-none'
  
  const variants = {
    primary: 'bg-fizzia-500 text-white hover:bg-fizzia-400 shadow-lg shadow-fizzia-500/25',
    outline: 'border border-dark-700 text-white hover:border-fizzia-500 hover:text-fizzia-400 bg-transparent',
    ghost: 'text-dark-300 hover:text-fizzia-400 bg-transparent',
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const classes = `${base} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`

  const content = (
    <>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </>
  )

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {content}
      </a>
    )
  }

  return (
    <button className={classes} onClick={onClick} disabled={disabled} {...props}>
      {content}
    </button>
  )
}
