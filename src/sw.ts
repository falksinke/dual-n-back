/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL, cleanupOutdatedCaches } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

registerRoute(
    new NavigationRoute(createHandlerBoundToURL('/index.html'), {
        denylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
    })
);

self.addEventListener('install', () => {
    // First visit: activate immediately so precache can control the page.
    // Updates stay waiting until the app posts SKIP_WAITING while idle.
    if (!self.registration.active) {
        void self.skipWaiting();
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        void self.skipWaiting();
    }
});
