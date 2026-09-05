import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: false, // Manual registration in main app layout
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  sw: "sw-main.js",
  fallbacks: {
    document: "/offline"
  },
  runtimeCaching: [
    // Cache app pages (stale-while-revalidate)
    {
      urlPattern: /^https:\/\/.*\/(dashboard|compose|sent|drafts|templates|scheduled|bulk|monitor|settings|certificates|contacts|qr)$/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "app-pages",
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 24 * 60 * 60 // 1 day
        }
      }
    },
    // Cache static assets aggressively
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    },
    // Cache fonts
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    },
    // Cache QR images
    {
      urlPattern: /\/api\/qr\/img\/.*/,
      handler: "CacheFirst",
      options: {
        cacheName: "qr-images",
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        }
      }
    },
    // Cache API reads (short lived)
    {
      urlPattern: /\/api\/(sent|drafts|templates|scheduled|contacts|certificates|announcements\/active|user\/stats\/quick|user\/dashboard)/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-reads",
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutes
        }
      }
    },
    // Never cache auth or send routes
    {
      urlPattern: /\/api\/(auth|send|send-bulk|track|qr\/validate|cron)\/.*/,
      handler: "NetworkOnly",
      options: {}
    }
  ]
});


/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "nodemailer", "bcryptjs", "sharp"],
  turbopack: {
    root: process.cwd()
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none';"
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains"
          }
        ]
      }
    ];
  }
};

export default withPWA(nextConfig);
