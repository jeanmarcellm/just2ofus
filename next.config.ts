import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Emits /rota/index.html so the Capacitor webview can resolve every route as a directory.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
