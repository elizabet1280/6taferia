import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}

const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
        void updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        const checkUpdate = () => {
            void registration.update().catch(() => {
                // Ignorar errores de red al comprobar actualización
            });
        };
        window.addEventListener('focus', checkUpdate);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                checkUpdate();
            }
        });
    },
});

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error('Failed to find the root element. The React app could not be mounted.');
}
