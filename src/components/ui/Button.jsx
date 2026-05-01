export function Button({ children, href, variant = 'primary', size = 'default', type = 'button' }) {
  const variantClass = {
    primary: 'primary-button',
    secondary: 'secondary-button',
    dark: 'dark-button',
  }[variant]
  const className = `${variantClass} ${size === 'large' ? 'large' : ''}`

  if (href) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    )
  }

  return (
    <button className={className} type={type}>
      {children}
    </button>
  )
}
