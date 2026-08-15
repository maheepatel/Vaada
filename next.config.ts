import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge sits over the bottom-left corner, which is where the
  // mosaic starts. It obscured a tile in every README screenshot, and it is
  // noise while working on the map too. Dev-only setting; no effect on a build.
  devIndicators: false,
};

export default nextConfig;
