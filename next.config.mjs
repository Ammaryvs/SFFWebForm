/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Surfaced to the client so the service worker's precache manifest can be
  // keyed to the build id (spec §11 — the stale-worker hazard).
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.BUILD_ID ?? 'dev',
  },
  async headers() {
    return [
      {
        // The worker must never be served from a stale HTTP cache, or the
        // build-id keyed precache can never roll forward.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
