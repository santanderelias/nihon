const CACHE_NAME = 'v1.0.4';
const URLS_TO_CACHE = [
    '/nihon/',
    '/nihon/index.html',
    '/nihon/css/style.css',
    '/nihon/css/bootstrap.min.css',
    '/nihon/js/script.js',
    '/nihon/js/bootstrap.bundle.min.js',
    '/nihon/js/wanakana.min.js',
    '/nihon/js/ni_sql-wasm.js',
    '/nihon/js/ni_sql-wasm.wasm',
    '/nihon/manifest.json',
    '/nihon/db/db_manifest.json',
    '/nihon/favicon.ico',
    '/nihon/fonts/NotoSansJP.woff2'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            console.log('Opened cache');
            
            // Cache essential app files
            await cache.addAll(URLS_TO_CACHE);

            // Fetch db manifest and cache db files
            const manifestResponse = await fetch('/nihon/db/db_manifest.json');
            const manifest = await manifestResponse.json();
            const dbFiles = manifest.files;

            const totalFiles = dbFiles.length;
            for (let i = 0; i < totalFiles; i++) {
                const file = dbFiles[i];
                const fileUrl = `/nihon/db/${file}`;
                
                // Inform clients about progress
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({
                            action: 'download-progress',
                            file: file,
                            current: i + 1,
                            total: totalFiles
                        });
                    });
                });

                // Cache each database file
                await cache.add(fileUrl);
            }
        }).catch(error => {
            console.error('Installation failed:', error);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('[Service Worker] Serving from cache:', event.request.url);
                    return response;
                }
                console.log('[Service Worker] Serving from network:', event.request.url);
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME]; // Re-introducing the definition
    self.clients.claim(); // Take control of uncontrolled clients immediately
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('message', event => {
    if (event.data.action === 'get-version') {
        event.source.postMessage({ version: CACHE_NAME });
    } else if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

self.addEventListener('message', event => {
    if (event.data.action === 'get-version') {
        event.source.postMessage({ version: CACHE_NAME });
    } else if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
