export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CLIENT: 'client',
  DEVELOPER: 'developer',
}

export const ROLE_HOME = {
  [ROLES.ADMIN]: '/admin',
  [ROLES.MANAGER]: '/admin',
  [ROLES.CLIENT]: '/cliente',
  [ROLES.DEVELOPER]: '/dev',
}

export const ROLE_ACCESS = {
  admin: [ROLES.ADMIN, ROLES.MANAGER],
  client: [ROLES.CLIENT],
  developer: [ROLES.ADMIN, ROLES.DEVELOPER],
}

export function normalizeRole(role) {
  return Object.values(ROLES).includes(role) ? role : ROLES.CLIENT
}

export function getRoleHome(role) {
  return ROLE_HOME[normalizeRole(role)]
}

export function canAccessRoleArea(area, role) {
  return ROLE_ACCESS[area]?.includes(normalizeRole(role)) ?? false
}
