import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import api from '../services/api';

function NotificationToggle() {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkNotificationStatus();
    }, []);

    const checkNotificationStatus = async () => {
        if ('Notification' in window && 'serviceWorker' in navigator && Notification.permission === 'granted') {
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } catch (error) {
                // Silent fail
            }
        }
    };

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const handleToggle = async () => {
        if (isSubscribed) {
            // Unsubscribe
            setLoading(true);
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();
                    await api.post('/admin/unsubscribe-notifications');
                    setIsSubscribed(false);
                }
            } catch (error) {
                // Silent fail
            } finally {
                setLoading(false);
            }
        } else {
            // Subscribe
            setLoading(true);
            try {
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') {
                    setLoading(false);
                    return;
                }

                const registration = await navigator.serviceWorker.register('/service-worker.js');
                await navigator.serviceWorker.ready;

                const { data } = await api.get('/admin/vapid-public-key');
                const vapidPublicKey = data.publicKey;

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
                });

                await api.post('/admin/subscribe-notifications', {
                    subscription: JSON.stringify(subscription)
                });

                setIsSubscribed(true);
            } catch (error) {
                // Silent fail
            } finally {
                setLoading(false);
            }
        }
    };

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        return null;
    }

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className="sidebar-item"
            style={{ marginBottom: '10px' }}
        >
            {isSubscribed ? (
                <Bell size={20} />
            ) : (
                <BellOff size={20} />
            )}
            <span>{loading ? '...' : (isSubscribed ? 'Push On' : 'Push Off')}</span>
        </button>
    );
}

export default NotificationToggle;
