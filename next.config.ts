import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/files/:path*",
      },
      // Proxy Socket.IO vers le socket-service interne
      // → tout passe par burgerminute.giize.com (SSL déjà configuré)
      // → plus besoin d'un second domaine avec SSL séparé
      {
        source: "/socket.io/:path*",
        destination: `${process.env.SOCKET_SERVICE_URL || 'http://socket-service:3003'}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
