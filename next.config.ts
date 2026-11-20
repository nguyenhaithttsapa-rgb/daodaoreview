import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/thumbnails/:id',
          destination: '/api/thumbnail/:id',
        },
      ],
      afterFiles: [
        {
          source: '/series/:slug',
          destination: '/watch/:slug',
        },
      ],
    };
  },
};

export default nextConfig;
