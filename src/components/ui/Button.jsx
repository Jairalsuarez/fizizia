export function Button({ children, href, variant = 'primary', size = 'default', type = 'button', onClick }) {
  const variantClass = {
    primary: 'primary-button',
    secondary: 'secondary-button',
    dark: 'dark-button',
  }[variant]
  const className = `${variantClass} ${size === 'large' ? 'large' : ''}`

  if (href) {
    return (
      <a className={className} href={href} onClick={onClick}>
        {children}
      </a>
    )
  }

  return (
    <button className={className} type={type} onClick={onClick}>
      {children}
    </button>
  )
}
