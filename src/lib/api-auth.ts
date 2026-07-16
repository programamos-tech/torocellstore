import { cookies } from 'next/headers'
import type { User } from '@/types'
import { checkPermission } from '@/lib/permissions'

export async function getRequestUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('torocell_user')?.value
  if (!raw) return null

  const candidates = [raw]
  try {
    candidates.push(decodeURIComponent(raw))
  } catch {
    /* ignore */
  }

  for (const value of candidates) {
    try {
      const user = JSON.parse(value) as User
      if (user?.id && user?.email) return user
    } catch {
      /* try next */
    }
  }

  return null
}

export function userHasPermission(user: User, module: string, action: string): boolean {
  return checkPermission(user, module, action)
}
