import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['192.168.3.25', 'http://192.168.3.25:3000', '192.168.3.25:3000', 'localhost:3000', '192.168.3.64', 'http://192.168.3.64:3000', '192.168.3.64:3000', '169.254.16.1', 'http://169.254.16.1:3000', '169.254.16.1:3000'],
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
