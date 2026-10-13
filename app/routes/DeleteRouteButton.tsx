'use client'

import { useFormStatus } from 'react-dom'

export function DeleteRouteButton({ name }: { name: string }) {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending}
    onClick={event => {
      if (!window.confirm(`Delete “${name}”? This permanently removes the route and cannot be undone.`)) event.preventDefault()
    }}
    className="min-h-10 shrink-0 rounded px-3 text-sm text-slate-300 transition hover:bg-red-950 hover:text-red-300 disabled:opacity-50">
    {pending ? 'Deleting…' : 'Delete'}
  </button>
}
