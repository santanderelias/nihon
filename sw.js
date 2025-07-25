const CACHE_NAME = 'v1.2.9'; // Updated cache name
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
        Promise.all([
            caches.open(CACHE_NAME).then(cache => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
            }),
            cacheDictionaryFiles()
        ]).catch(error => {
            console.error('Installation failed:', error);
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
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
    const existingCaches = await caches.keys();
    if (existingCaches.includes(CACHE_NAME)) {
        const cachedItems = await cache.keys();
        if (cachedItems.length > URLS_TO_CACHE.length) {
            console.log('Dictionary files already cached.');
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({ action: 'show-toast', title: 'Up to date', message: 'All files are cached.' });
                });
            });
            return;
        }
    }

    let i = 1;
    let count = 0;
    const BATCH_SIZE = 2; // Process files in batches of 2

    while (true) {
        const urlsToFetch = [];
        for (let j = 0; j < BATCH_SIZE; j++) {
            urlsToFetch.push(`/nihon/js/dict/dict-${i + j}.js`);
        }

        const responses = await Promise.all(
            urlsToFetch.map(url => fetch(url).catch(e => e))
        );

        let batchFinished = false;
        for (const response of responses) {
            if (response instanceof Response) {
                if (response.ok) {
                    await cache.put(response.url, response);
                    count++;
                } else {
                    if (response.status === 404) {
                        console.log(`Dictionary file not found: ${response.url}`);
                    } else {
                        console.error(`Failed to cache ${response.url}. Status: ${response.status}`);
                    }
                    batchFinished = true;
                    break;
                }
            } else {
                console.error(`Error fetching a dictionary file:`, response);
                batchFinished = true;
                break;
            }
        }

        if (batchFinished) {
            break;
        }

        i += BATCH_SIZE;
    }

    console.log(`Successfully cached ${count} dictionary files.`);
    return count;
}
