import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Explicit: this app wants request-time rendering, not cached components.
  cacheComponents: false,
}

export default nextConfig
