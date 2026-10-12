import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  // A signed-in visitor gets sent on, which is what makes `/` correct for both
  // states. If the auth service is unreachable we fall through to the form
  // rather than 500-ing the only page that could explain the problem.
  let signedIn = false
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    signedIn = Boolean(data?.claims)
  } catch {
    signedIn = false
  }

  if (signedIn) redirect('/routes')

  const demoConfigured = Boolean(process.env.DEMO_EMAIL && process.env.DEMO_PASSWORD)

  return <LoginForm demoConfigured={demoConfigured} />
}
