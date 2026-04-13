/** @type {import('next').NextConfig} */
const path = require('path')
const { loadEnvConfig } = require('@next/env')

// Monorepo: load `.env` / `.env.local` from repo root when Next runs from `apps/web`
const repoRoot = path.resolve(__dirname, '..', '..')
loadEnvConfig(repoRoot, process.env.NODE_ENV !== 'production')

// Standalone: Docker/self-hosted when TEVAD_STANDALONE=1; Netlify adapter expects it on CI.
// Avoid enabling locally unless you need it — mixed standalone + `next dev` can confuse tooling.
const useStandalone =
  process.env.TEVAD_STANDALONE === '1' || process.env.NETLIFY === 'true'

const nextConfig = {
  ...(useStandalone ? { output: 'standalone' } : {}),
  transpilePackages: ['@tevad/scraper', '@tevad/rss-monitor', '@tevad/verifier'],
  experimental: {
    // Avoid broken ../vendor-chunks/@supabase.js resolution (Windows / webpack) on RSC routes.
    serverComponentsExternalPackages: ['@supabase/supabase-js', '@supabase/ssr'],
  },
  async redirects() {
    return [
      { source: '/politicieni', destination: '/', permanent: false },
      { source: '/politicieni/:slug', destination: '/politician/:slug', permanent: true },
    ]
  },
  webpack: (config, { dev, isServer }) => {
    // Stale numbered chunks (e.g. ./193.js) after HMR / interrupted dev — common on Windows.
    if (dev) {
      config.cache = false
      // Fewer server chunks → fewer broken relative requires between chunk files.
      if (isServer) {
        config.optimization = {
          ...config.optimization,
          splitChunks: false,
        }
      }
    }
    return config
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.cdep.ro', pathname: '/**' },
      { protocol: 'https', hostname: 'cdep.ro', pathname: '/**' },
      { protocol: 'https', hostname: 'www.senat.ro', pathname: '/**' },
      { protocol: 'https', hostname: 'senat.ro', pathname: '/**' },
      { protocol: 'https', hostname: 'www.gov.ro', pathname: '/**' },
      { protocol: 'https', hostname: 'gov.ro', pathname: '/**' },
    ],
  },
}

module.exports = nextConfig
