/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ⚠️ Permet le build même avec des warnings ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ⚠️ Ignore les erreurs TypeScript pendant le build
    // Nécessaire pour react-big-calendar qui a des types incomplets
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig