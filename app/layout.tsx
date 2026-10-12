import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Alpine Start',
  description: 'When to leave the car, so you summit before the storm and get down before dark.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-full bg-slate-950 text-slate-200 antialiased">{children}</body>
    </html>
  )
}
