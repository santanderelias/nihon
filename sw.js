const CACHE_NAME = 'v1.2.26'; // Updated cache name
const URLS_TO_CACHE = [
    '/nihon/',
    '/nihon/index.html',
    '/nihon/css/style.css',
    '/nihon/css/bootstrap.min.css',
    '/nihon/js/script.js',
    '/nihon/js/script.min.js',
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

    // Check if dictionary files are already cached by checking for dict-1.js
    const dictFile1Url = `/nihon/js/dict/dict-1.js`;
    const cachedResponse = await cache.match(dictFile1Url);

    if (cachedResponse) {
        console.log('Dictionary files already cached.');
        return;
    }

    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            // Inform the client that dictionary download is starting, but without a toast
            // client.postMessage({ action: 'show-toast', title: 'Downloading Libraries', message: 'This may take a moment and use high memory.' });
        });
    });

    let i = 1;
    let count = 0;
    const BATCH_SIZE = 1; // Process files one by one for memory optimization

    while (true) {
        const urlToFetch = `/nihon/js/dict/dict-${i}.js`;
        let response;
        try {
            response = await fetch(urlToFetch);
        } catch (error) {
            console.error(`Error fetching ${urlToFetch}:`, error);
            break; // Stop if there's a network error
        }

        if (response.ok) {
            await cache.put(urlToFetch, response);
            count++;
            i++;
        } else {
            if (response.status === 404) {
                console.log(`Dictionary file not found: ${urlToFetch}. Assuming end of dictionary files.`);
            } else {
                console.error(`Failed to cache ${urlToFetch}. Status: ${response.status}`);
            }
            break; // Stop on 404 or other non-OK responses
        }
    }

    console.log(`Successfully cached ${count} dictionary files.`);
    return count;
}
