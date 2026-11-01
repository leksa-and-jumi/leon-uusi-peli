/// <reference types="vitest/config" />
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Every file in `dir` and the folders in it, as paths from `dir`. */
function filesIn(dir: string, from = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? filesIn(join(dir, entry.name), from)
      : [relative(from, join(dir, entry.name)).split('\\').join('/')],
  );
}

/** A short name for this exact set of files: a new build gets a new one. */
function versionOf(files: readonly string[]): string {
  let hash = 2166136261;
  for (const char of files.join('|')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(36);
}

/**
 * The service worker: the browser keeps every file of the game, so that once the game
 * has been opened it starts without the internet too, like an app on the phone. The
 * page itself is fetched fresh when there is a connection, so a new version comes
 * along; everything else has a new name in a new version and can come straight from
 * what is kept.
 */
function offline(): Plugin {
  return {
    name: 'offline',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = ['./', ...Object.keys(bundle), ...filesIn('public')].filter(
        (file) => !file.endsWith('.map') && !/(^|\/)\.[^/]/.test(file),
      );
      const source = `// Made by the build (vite.config.ts): keeps the game for playing without the internet.
const KEEP = 'leon-peli-${versionOf(files)}';
const FILES = ${JSON.stringify(files)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(KEEP)
      .then((kept) => kept.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== KEEP).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((fresh) => {
          const copy = fresh.clone();
          caches.open(KEEP).then((kept) => kept.put('./', copy));
          return fresh;
        })
        .catch(() => caches.match('./', { ignoreSearch: true, ignoreVary: true })),
    );
    return;
  }
  event.respondWith(
    // The game's own files are the same whoever asks: the page's scripts ask a little differently
    caches.match(request, { ignoreVary: true }).then(
      (kept) =>
        kept ??
        fetch(request).then((fresh) => {
          if (fresh.ok) {
            const copy = fresh.clone();
            caches.open(KEEP).then((store) => store.put(request, copy));
          }
          return fresh;
        }),
    ),
  );
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// Relative base so the build works on GitHub Pages under /<repo>/.
export default defineConfig({
  base: './',
  plugins: [offline()],
  build: {
    outDir: 'dist',
    // Older phones and their browsers (not only Chrome and Safari) can run it too
    target: 'es2020',
    // Phaser alone is ~1.2 MB minified; that is expected.
    chunkSizeWarningLimit: 1500,
    // Phaser is large; keep it in its own chunk.
    rollupOptions: {
      output: {
        manualChunks: { phaser: ['phaser'] },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
