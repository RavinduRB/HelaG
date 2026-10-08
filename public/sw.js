const CACHE_NAME = 'helag-v4'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/helag-logo-192.png', '/helag-logo-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const requestUrl = new URL(event.request.url)

  if (requestUrl.pathname.startsWith('/api/auth/')) return

  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
      }
      return response
    }).catch(() => caches.match(event.request).then((cached) => cached || new Response('[]', { headers: { 'Content-Type': 'application/json' } }))))
    return
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok && requestUrl.origin === self.location.origin) {
      const copy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
    }
    return response
  }).catch(() => requestUrl.pathname === '/' || event.request.mode === 'navigate' ? caches.match('/') : Response.error())))
})
