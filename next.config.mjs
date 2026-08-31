/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Surfaced to the client so the service worker's precache manifest can be
  // keyed to the build id (spec §11 — the stale-worker hazard).
  //
  // The fallback chain matters. VERCEL_GIT_COMMIT_SHA is populated only for
  // Git-connected deployments; a CLI deploy from a repo with no remote
  // leaves it empty, which would pin the build id to 'dev' forever. The
  // precache would then never invalidate, and every hotfix during the event
  // would serve the old app to every returning phone — while a fresh
  // incognito window passed the smoke test.
  //
  // VERCEL_DEPLOYMENT_ID and VERCEL_URL are both unique per deployment, so
  // either produces a new precache. 'dev' is reached only when building
  // outside Vercel entirely.
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.VERCEL_DEPLOYMENT_ID ||
      process.env.VERCEL_URL ||
      process.env.BUILD_ID ||
      'dev',
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
