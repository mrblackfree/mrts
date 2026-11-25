import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 100% portable build: `.next/standalone` contains a self-contained Node server
  // (server.js + minimal node_modules) that runs on any Linux/Windows VM or container.
  output: 'standalone',
  // Pin tracing to this folder so the standalone server lands at `.next/standalone/server.js`
  // even when this project lives inside a larger monorepo.
  outputFileTracingRoot: projectRoot,
  turbopack: { root: projectRoot },
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      // admin page and API: never cached, never indexed, never framed
      ...['/admin', '/admin/:path*', '/api/admin/:path*'].map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      })),
    ];
  },
};

export default nextConfig;
