import { defineConfig } from "vite";

// base "./" lets the build work on GitHub Pages sub-paths as well as Netlify/Cloudflare/Vercel roots.
export default defineConfig({
  base: "./",
  build: { target: "es2022" },
});
