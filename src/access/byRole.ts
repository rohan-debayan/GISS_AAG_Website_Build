import type { Access, FieldAccess } from 'payload'

/**
 * Role model:
 *   - admin   — can do anything (super-user)
 *   - editor  — can CRUD all content, but cannot manage users
 *   - author  — can CRUD only their own posts/events; read-only elsewhere
 *   - (none)  — public site visitors with no account
 *
 * These helpers are designed to be imported by collection configs.
 */

type Role = 'admin' | 'editor' | 'author'

const roleOf = (user: unknown): Role | null => {
  if (!user || typeof user !== 'object') return null
  // @ts-expect-error — Payload typegen runs later; role is set at runtime.
  const r = user.role
  return r === 'admin' || r === 'editor' || r === 'author' ? r : null
}

export const anyone: Access = () => true

export const isAdmin: Access = ({ req }) => roleOf(req.user) === 'admin'

export const isAdminFieldLevel: FieldAccess = ({ req }) =>
  roleOf(req.user) === 'admin'

export const isAdminOrEditor: Access = ({ req }) => {
  const r = roleOf(req.user)
  return r === 'admin' || r === 'editor'
}

export const isAuthenticated: Access = ({ req }) => Boolean(req.user)

/**
 * Read access for content that supports drafts:
 *   - public sees only published
 *   - anyone logged in sees everything (so editors can review drafts)
 */
export const publicReadOrAuthed: Access = ({ req }) => {
  if (req.user) return true
  return {
    _status: { equals: 'published' },
  }
}

/**
 * Write access to own-vs-any content. `userField` is the slug of the
 * relationship on the collection that points at users (e.g. 'author').
 */
export const adminOrSelf =
  (userField = 'author'): Access =>
  ({ req }) => {
    const r = roleOf(req.user)
    if (r === 'admin' || r === 'editor') return true
    if (!req.user) return false
    return {
      [userField]: { equals: req.user.id },
    }
  }
