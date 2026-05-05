export const avatars = Array.from({ length: 16 }, (_, i) => ({
  id: String(i + 1),
  label: `Avatar ${i + 1}`,
  src: `/avatars/${i + 1}.png`,
}))

export function AvatarIcon({ id, size = 40, className = '', zoom = 1.5 }) {
  const avatar = avatars.find(a => a.id === id) || avatars[0]
  return (
    <div className={className} style={{ width: size, height: size, overflow: 'hidden', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={avatar.src}
        alt={avatar.label}
        style={{
          width: `${zoom * 100}%`,
          height: `${zoom * 100}%`,
          objectFit: 'cover',
          display: 'block',
        }}
        loading="lazy"
      />
    </div>
  )
}
