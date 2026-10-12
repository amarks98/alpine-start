/** Fail loudly and usefully rather than with "Invalid URL" from deep in a client. */
export function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.local.example to .env.local and fill it in ` +
        `(Supabase dashboard → Settings → API).`,
    )
  }
  return value
}

export const SUPABASE_URL = () => requiredEnv('NEXT_PUBLIC_SUPABASE_URL')
export const SUPABASE_ANON_KEY = () => requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
