const CACHE_NAME = 'v1.2.4';
const URLS_TO_CACHE = [
    '/nihon/',
    '/nihon/index.html',
    '/nihon/css/style.css',
    '/nihon/css/bootstrap.min.css',
    '/nihon/js/script.js',
    '/nihon/js/bootstrap.bundle.min.js',
    '/nihon/js/wanakana.min.js',
    '/nihon/manifest.json',
    '/nihon/favicon.ico',
    '/nihon/fonts/NotoSansJP.woff2'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => {
                return cacheDictionaryFiles().then(count => {
                    console.log(`Successfully cached ${count} dictionary files.`);
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
    const cacheWhitelist = [CACHE_NAME];
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

async function cacheDictionaryFiles() {
    const cache = await caches.open(CACHE_NAME);
    let i = 1;
    let count = 0;
    while (true) {
        const url = `/nihon/js/dict/dict-${i}.js`;
        try {
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
                count++;
                i++;
            } else {
                if (response.status === 404) {
                    console.log(`Finished caching dictionary files. Last file found: dict-${i - 1}.js`);
                } else {
                    console.error(`Failed to cache ${url}. Status: ${response.status}`);
                }
                break;
            }
        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            break;
        }
    }
    return count;
}
