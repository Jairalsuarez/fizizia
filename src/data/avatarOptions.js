export const avatars = Array.from({ length: 16 }, (_, i) => ({
  id: String(i + 1),
  label: `Avatar ${i + 1}`,
  src: `/avatars/${i + 1}.png`,
}))
