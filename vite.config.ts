// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from 'vite-plugin-pwa';
import { loadEnv } from 'vite';
import path from 'node:path';

// Server env only; the wrapper still exposes only VITE_* to the browser.
Object.assign(process.env, loadEnv(process.env['NODE_ENV'] === 'production' ? 'production' : 'development', process.cwd(), ''));

export default defineConfig({
  vite: { resolve: { alias: {
    // Older and newer htmlparser2 versions use different decoder entry points.
    // Resolve both to actual bundled files before the root package alias matches.
    'entities/decode': path.resolve(process.cwd(), 'node_modules/entities/lib/esm/decode.js'),
    'entities/escape': path.resolve(process.cwd(), 'node_modules/entities/lib/esm/escape.js'),
    'entities/lib/decode.js': path.resolve(process.cwd(), 'node_modules/entities/lib/esm/decode.js'),
    'entities/lib/encode.js': path.resolve(process.cwd(), 'node_modules/entities/lib/esm/encode.js'),
    'entities/lib/escape.js': path.resolve(process.cwd(), 'node_modules/entities/lib/esm/escape.js'),
    'entities': path.resolve(process.cwd(), 'node_modules/entities'),
  } }, plugins: [VitePWA({registerType:'autoUpdate',injectRegister:null,devOptions:{enabled:false},manifest:false,scope:'/kids',workbox:{globPatterns:['**/*.{js,css,woff2}'],navigateFallback:null,runtimeCaching:[{urlPattern:({request,url})=>request.mode==='navigate'&&/^\/kids(?:\/|$)/.test(url.pathname),handler:'NetworkFirst',options:{cacheName:'bugley-kids-public-navigation',networkTimeoutSeconds:3,cacheableResponse:{statuses:[]},precacheFallback:{fallbackURL:'/kids-offline.html'}}},{urlPattern:({url})=>url.origin===self.location.origin&&/\/assets\/.+-[\w-]+\.(js|css|woff2)$/.test(url.pathname),handler:'CacheFirst',options:{cacheName:'bugley-kids-assets',expiration:{maxEntries:150,maxAgeSeconds:30*86400}}}],additionalManifestEntries:[{url:'/kids-offline.html',revision:'kids-offline-v1'}]}})] },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
