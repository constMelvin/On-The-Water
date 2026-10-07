import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// The Content-Security-Policy is set per request in src/proxy.ts (it needs a fresh script nonce).

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // camera=(self): the Chismis camera (CameraCapture) runs on our own pages only; iframes stay blocked.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), payment=(), usb=(), geolocation=(self)' },
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dev only: lets a phone on the same Wi-Fi open the dev server by the PC's LAN address.
  allowedDevOrigins: ['192.168.2.4'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
