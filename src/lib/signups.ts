/**
 * Local-only member intake.
 * The app has no backend, so signups are kept in the browser and surfaced
 * honestly in the UI (see the note on the signup form).
 */

export type MemberRole = 'Farmer' | 'Buyer' | 'Funder' | 'Business'

export interface Signup {
  id: string
  name: string
  email: string
  role: MemberRole
  org: string
  region: string
  createdAt: string
}

const STORAGE_KEY = 'farmcoop.signups.v1'

function readRaw(): Signup[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Signup[]) : []
  } catch {
    return []
  }
}

export function loadSignups(): Signup[] {
  return readRaw()
}

export function saveSignup(input: Omit<Signup, 'id' | 'createdAt'>): Signup {
  const existing = readRaw()
  const record: Signup = {
    ...input,
    id: `FC-${String(existing.length + 1).padStart(4, '0')}`,
    createdAt: new Date().toISOString(),
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, record]))
  } catch {
    // Storage can be unavailable (private mode / quota). The confirmation still
    // renders; the record just won't survive a reload.
  }
  return record
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}
