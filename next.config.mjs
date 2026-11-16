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
    // Content-Security-Policy TIDAK ada di sini: nilainya bergantung pada
    // nonce per request, jadi dipasang di `src/middleware.ts`. Header statis
    // di bawah tidak butuh nonce sehingga tetap efisien di level CDN.
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            // Hanya efektif di https; browser mengabaikannya saat dev.
            value: "max-age=63072000; includeSubDomains; preload",
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
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
