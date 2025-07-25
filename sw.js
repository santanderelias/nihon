let cacheName;

self.addEventListener('install', event => {
    event.waitUntil(
        fetch('/nihon/version.json')
            .then(response => response.json())
            .then(versionData => {
                cacheName = `nihon-v${versionData.version}`;
                const urlsToCache = [
                    '/nihon/',
                    '/nihon/index.html',
                    '/nihon/css/style.css',
                    '/nihon/css/bootstrap.min.css',
                    '/nihon/js/script.js',
                    '/nihon/js/bootstrap.bundle.min.js',
                    '/nihon/manifest.json',
                    '/nihon/fonts/NotoSansJP.woff2',
                    '/nihon/version.json'
                ];
                return caches.open(cacheName).then(cache => {
                    console.log('Opened cache:', cacheName);
                    return cache.addAll(urlsToCache);
                });
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName.startsWith('nihon-v') && cacheName !== self.cacheName) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
