import { defineConfig } from "vite";

// base "./" lets the build work on GitHub Pages sub-paths as well as Netlify/Cloudflare/Vercel roots.
export default defineConfig({
  base: "./",
  build: { target: "es2022" },
  server: {
    // Allow the ngrok tunnel hostname (Vite blocks unknown hosts by default).
    allowedHosts: ["scion-powdered-luckiness.ngrok-free.dev"],
    proxy: {
      // Forward /api/* to the Python Flask vision server during development.
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});