import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is left off on purpose: every page here depends on the
  // logged-in user, so plain dynamic rendering is simpler to reason about.
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
