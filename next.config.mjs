import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// Run generate-updates script on startup (dev or build)
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const scriptPath = path.join(__dirname, "scripts/generate-updates.js");
  execSync(`node "${scriptPath}"`, { stdio: "inherit" });
} catch (e) {
  console.warn("Failed to auto-generate updates during Next.js config load:", e.message);
}

/** @type {import("next").NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://www.gstatic.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co https://*.googleapis.com https://fcm.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://challenges.cloudflare.com wss://*.supabase.co",
              "frame-src https://accounts.google.com https://content.googleapis.com https://challenges.cloudflare.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
