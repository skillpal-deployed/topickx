import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Tell Turbopack the correct workspace root (the frontend/ dir).
  // Without this, Next.js 16 detects both /var/www/skillpal/package-lock.json
  // and /var/www/skillpal/frontend/package-lock.json and picks the parent dir,
  // which causes a Turbopack panic: "Dependency tracking is disabled".
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.digitaloceanspaces.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'topickx.com',
      },
      {
        protocol: 'https',
        hostname: 'www.topickx.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  compress: true,
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
};

export default nextConfig;
