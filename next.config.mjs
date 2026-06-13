import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Run generate-updates script on startup (dev or build)
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const scriptPath = path.join(__dirname, 'scripts/generate-updates.js');
  execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
} catch (e) {
  console.warn('Failed to auto-generate updates during Next.js config load:', e.message);
}

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
