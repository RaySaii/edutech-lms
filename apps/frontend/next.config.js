/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['lucide-react'],
  outputFileTracingRoot: '../../',
}

module.exports = nextConfig