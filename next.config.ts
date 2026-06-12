import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],

  // HTTP-level redirect (no JS required) — fixes Safari RSC redirect hang
  async redirects() {
    return [
      {
        source: "/",
        destination: "/discover",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
