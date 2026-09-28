import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static: Azure Static Web Apps serves the `out/` folder. Asset cache
  // headers live in public/staticwebapp.config.json, since export mode ignores headers().
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // The floating dev badge sat over the sidebar footer.
  devIndicators: false,
  // A stray pnpm-workspace.yaml in the home directory made Next guess the wrong root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
