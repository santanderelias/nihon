importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.0/workbox-sw.js');

if (workbox) {
    console.log('Workbox is loaded!');

    // Set the cache name prefix for Workbox
    workbox.core.setCacheNameDetails({
        prefix: 'nihon',
        suffix: 'v1.1.0' // New version for Workbox cache
    });

    // Precache essential app files
    workbox.precaching.precacheAndRoute([
        { url: '/nihon/index.html', revision: null },
        { url: '/nihon/css/style.css', revision: null },
        { url: '/nihon/css/bootstrap.min.css', revision: null },
        { url: '/nihon/js/script.js', revision: null },
        { url: '/nihon/js/bootstrap.bundle.min.js', revision: null },
        { url: '/nihon/js/wanakana.min.js', revision: null },
        { url: '/nihon/js/sql-wasm.js', revision: null },
        { url: '/nihon/js/sql-wasm.wasm', revision: null },
        { url: '/nihon/manifest.json', revision: null },
        { url: '/nihon/db/db_manifest.json', revision: null },
        { url: '/nihon/favicon.ico', revision: null },
        { url: '/nihon/fonts/NotoSansJP.woff2', revision: null }
    ]);

    // Runtime caching for SQLite database files
    workbox.routing.registerRoute(
        ({ url }) => url.pathname.startsWith('/nihon/db/jmdict_') && url.pathname.endsWith('.sqlite'),
        new workbox.strategies.CacheFirst({
            cacheName: 'nihon-db-cache',
            plugins: [
                new workbox.expiration.ExpirationPlugin({
                    maxEntries: 50, // Cache a maximum of 50 database files
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                }),
                new workbox.cacheableResponse.CacheableResponsePlugin({
                    statuses: [0, 200], // Cache successful responses and opaque responses
                }),
            ],
        })
    );

    // Handle messages from the main thread
    self.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
            self.skipWaiting();
        }
        // For versioning, we can use Workbox's built-in cache names
        // or send a custom message if needed.
        // For now, the main thread can infer the version from the precache name.
    });

} else {
    console.log('Workbox did not load.');
}

