const CACHE_NAME = 'financas-app-v1';
const ARQUIVOS_CACHE = [
    './',
    './index.html',
    './style.css',
    './index.js',
    './manifest.json'
];

// Instala o app e salva os arquivos principais em cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ARQUIVOS_CACHE);
        })
    );
    self.skipWaiting();
});

// Limpa caches antigos ao atualizar o app
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Permite abrir o app mesmo sem internet
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});

// ==========================================
// NOTIFICAÇÕES PUSH EM SEGUNDO PLANO
// ==========================================
self.addEventListener('push', function(event) {
    let payload = { title: '⏰ Bom dia!', body: 'Você tem compromissos agendados para hoje.' };

    if (event.data) {
        try {
            payload = event.data.json();
        } catch (e) {
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (let client of windowClients) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./index.html');
            }
        })
    );
});