import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/series/:slug',
        destination: '/watch/:slug',
      },
    ];
  },
};

export default nextConfig;
