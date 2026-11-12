// sw.js - Escuta notificações Push em segundo plano

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
        icon: 'https://cdn-icons-png.flaticon.com/512/3119/3119338.png', // Substitua pelo ícone da sua app
        badge: 'https://cdn-icons-png.flaticon.com/512/3119/3119338.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

// Ao clicar na notificação, abre o aplicativo
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (let client of windowClients) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});