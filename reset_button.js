(function() {
    const buttonHtml = `
        <button id="floating-reset-button" class="btn btn-danger rounded-circle shadow-lg" style="position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; font-size: 1.5rem; z-index: 9999;">
            🔄
        </button>
    `;
    document.body.insertAdjacentHTML('beforeend', buttonHtml);

    const floatingResetButton = document.getElementById('floating-reset-button');
    floatingResetButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to completely reset the app? This will delete all data, caches, and service workers.')) {
            // Unregister all service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                    console.log('Service Worker unregistered:', registration.scope);
                }
            }

            // Clear all caches
            const cacheNames = await caches.keys();
            for (let cacheName of cacheNames) {
                await caches.delete(cacheName);
                console.log('Cache deleted:', cacheName);
            }

            // Clear all localStorage data
            localStorage.clear();
            console.log('All localStorage data cleared.');

            // Clear IndexedDB
            const dbRequest = indexedDB.deleteDatabase('nihonDictionary');
            dbRequest.onsuccess = () => console.log('IndexedDB deleted.');
            dbRequest.onerror = (event) => console.error('Error deleting IndexedDB:', event.target.error);

            alert('App has been completely reset. Please refresh the page.');
            location.reload();
        }
    });
})();