import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "url";

// Security headers for the pages themselves (the API sets its own in backend/src/app.js).
// In production the web server that hosts the built files must send the same headers.
function securityHeaders(dev) {
  const csp = [
    "default-src 'self'",
    // The dev server injects an inline script for hot reload; the built site needs none
    `script-src 'self'${dev ? " 'unsafe-inline'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    // The API on port 5000 (same host), plus the hot-reload socket in development
    `connect-src 'self' http://*:5000 https://*:5000${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  return {
    "Content-Security-Policy": csp,
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
  };
}

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],

  server: {
    host: true,          // listen on all interfaces so Burp can reach it via the LAN IP
    allowedHosts: true,  // accept any Host header (LAN IP, custom hostnames)
    headers: securityHeaders(true),
  },

  preview: {
    headers: securityHeaders(false),
  },

  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
