import { redirect } from 'next/navigation'

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

/** Redirección legacy: /dashboard → /reportes */
export default async function DashboardRedirect({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {}
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') q.set(key, value)
    else if (Array.isArray(value)) value.forEach((v) => q.append(key, v))
  }
  const query = q.toString()
  redirect(query ? `/reportes?${query}` : '/reportes')
}
