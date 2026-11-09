import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/series/:slug',
        destination: '/watch/:slug',
      },
      {
        source: '/thumbnails/:id.jpg',
        destination: '/api/thumbnail/:id',
      },
    ];
  },
};

export default nextConfig;
