import type { NextConfig } from 'next'

declare module 'next-pwa' {
  interface PWAConfig {
    dest: string
    disable?: boolean
    register?: boolean
    skipWaiting?: boolean
    runtimeCaching?: Array<{
      urlPattern: RegExp | string
      handler: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate'
      options?: object
    }>
    buildExcludes?: Array<RegExp | string>
  }

  function withPWA(config?: PWAConfig): (nextConfig: NextConfig) => NextConfig
  export default withPWA
}
