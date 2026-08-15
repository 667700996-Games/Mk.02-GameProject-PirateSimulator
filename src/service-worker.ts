/// <reference lib="webworker" />

import { build, files, prerendered, version } from '$service-worker';

const worker = self as unknown as ServiceWorkerGlobalScope;
const shellCache = `blackwake-shell-${version}`;
const runtimeCache = `blackwake-runtime-${version}`;
const INSTALL_STATIC_ASSETS = new Set([
  '/art/pirate-haven-keyart.png',
  '/manifest.webmanifest',
  '/pirate-mark-192.png',
  '/pirate-mark-512.png',
  '/pirate-mark.svg'
]);
const shellAssets = [
  ...new Set([
    ...build,
    ...prerendered,
    ...files.filter((asset) => INSTALL_STATIC_ASSETS.has(asset))
  ])
];
const MAX_RUNTIME_ENTRIES = 80;

async function cacheShell(): Promise<void> {
  const cache = await caches.open(shellCache);
  await Promise.all(
    shellAssets.map(async (asset) => {
      try {
        const response = await fetch(asset);
        if (response.ok) await cache.put(asset, response);
      } catch {
        // A single optional shell asset must not make the worker installation fail.
      }
    })
  );
}

async function trimRuntimeCache(): Promise<void> {
  const cache = await caches.open(runtimeCache);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_RUNTIME_ENTRIES)).map((request) => cache.delete(request)));
}

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic' && !request.headers.has('range')) {
    const cache = await caches.open(runtimeCache);
    await cache.put(request, response.clone());
    void trimRuntimeCache();
  }
  return response;
}

async function navigationResponse(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) return response;
  } catch {
    // The precached app shell below is the intentional offline fallback.
  }
  return (await caches.match('/index.html')) ?? (await caches.match('/')) ?? Response.error();
}

worker.addEventListener('install', (event) => {
  event.waitUntil(cacheShell());
  worker.skipWaiting();
});

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('blackwake-') && ![shellCache, runtimeCache].includes(key)).map((key) => caches.delete(key))))
      .then(() => worker.clients.claim())
  );
});

worker.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void worker.skipWaiting();
});

worker.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== worker.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(navigationResponse(event.request));
    return;
  }
  if (['script', 'style', 'font', 'image', 'audio'].includes(event.request.destination)) event.respondWith(cacheFirst(event.request));
});
