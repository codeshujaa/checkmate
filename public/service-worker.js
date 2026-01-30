// Service Worker for Push Notifications
const CACHE_NAME = 'checkmate-v1';

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installed');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activated');
    event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push received');

    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = {
                title: 'Checkmate Notification',
                body: event.data.text()
            };
        }
    }

    const title = data.title || 'Checkmate Admin';
    const options = {
        body: data.body || 'New notification',
        icon: '/favicon.png',
        badge: '/favicon.png',
        vibrate: [300, 100, 300, 100, 300], // Stronger vibration pattern
        sound: '/notification.mp3', // Sound file
        data: {
            url: data.url || '/dashboard/admin'
        },
        requireInteraction: true, // Stays on screen until dismissed
        tag: 'checkmate-notification',
        renotify: true, // Make sound even if notification with same tag exists
        silent: false // Ensure sound plays
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked');
    event.notification.close();

    const urlToOpen = event.notification.data.url || '/dashboard/admin';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // Check if a window is already open
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes('/dashboard') && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
