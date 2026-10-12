'use client'

import { useActionState, useState } from 'react'
import { signIn, signInDemo, signUp, type ActionState } from '@/app/actions'

export function LoginForm({ demoConfigured }: { demoConfigured: boolean }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [state, submit, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    null,
  )
  const [demoState, submitDemo, demoPending] = useActionState<ActionState, FormData>(
    signInDemo,
    null,
  )

  const error = state?.error ?? demoState?.error

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Alpine Start</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          When to leave the car, so you summit before the storm and get back down before dark.
        </p>
      </header>

      {demoConfigured && (
        <>
          <form action={submitDemo}>
            <button
              type="submit"
              disabled={demoPending}
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
            >
              {demoPending ? 'Signing in…' : 'Try the demo — no signup'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-600">
            <span className="h-px flex-1 bg-slate-800" />
            or
            <span className="h-px flex-1 bg-slate-800" />
          </div>
        </>
      )}

      <form action={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-slate-400">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-amber-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-slate-400">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {state?.message && (
          <p role="status" className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {mode === 'signin' ? 'No account yet?' : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="font-medium text-amber-500 underline-offset-2 hover:underline"
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </main>
  )
}
