import type { NextConfig } from "next";

/** Public assets change rarely: cache for a week, then serve stale for up to 30 days while revalidating. */
const ASSET_CACHE = "public, max-age=604800, stale-while-revalidate=2592000";

const nextConfig: NextConfig = {
  // The floating dev badge sat over the sidebar footer.
  devIndicators: false,
  // A stray pnpm-workspace.yaml in the home directory made Next guess the wrong root.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return ["/images/:path*", "/brand/:path*", "/models/:path*"].map((source) => ({
      source,
      headers: [{ key: "Cache-Control", value: ASSET_CACHE }],
    }));
  },
};

export default nextConfig;
