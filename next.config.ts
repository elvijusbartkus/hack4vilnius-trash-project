import type { NextConfig } from "next";

// GitHub Pages: static export served from /hack4vilnius-trash-project/. Set by the deploy workflow.
const isGithubPages = process.env.GITHUB_PAGES === "true";

const basePath = isGithubPages ? "/hack4vilnius-trash-project" : "";

const nextConfig: NextConfig = {
  // Exposed to the browser for static asset URLs (manifest, service worker, icons).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // PPR can't run in export mode; the app is fully client-side so Pages doesn't need it.
  cacheComponents: !isGithubPages,
  partialPrefetching: !isGithubPages,
  ...(isGithubPages && {
    output: "export",
    basePath,
    trailingSlash: true, // /driver/ -> driver/index.html, so Pages serves it directly
    images: { unoptimized: true },
  }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
