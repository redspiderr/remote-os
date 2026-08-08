import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // removed to support API routes
  distDir: 'dist',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
};

export default nextConfig;
