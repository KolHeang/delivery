import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    '*.new-delivery.rithyboth.work',
    'new-delivery.rithyboth.work',
    '*.localhost',
    'localhost',
    '10.1.52.220',
  ],
};

export default nextConfig;
