import { registerSW } from 'virtual:pwa-register';

type UpdateReadyListener = (ready: boolean) => void;

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;
let updateReady = false;
const listeners = new Set<UpdateReadyListener>();

function notify(ready: boolean) {
    updateReady = ready;
    for (const listener of listeners) {
        listener(ready);
    }
}

export function initServiceWorker() {
    if (import.meta.env.DEV || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
            notify(true);
        },
        onOfflineReady() {
            // Precache complete; offline play is available after this visit.
        },
    });
}

export function subscribeUpdateReady(listener: UpdateReadyListener): () => void {
    listeners.add(listener);
    listener(updateReady);
    return () => {
        listeners.delete(listener);
    };
}

export function applyPendingUpdate() {
    if (!updateReady || !updateSW) return;
    void updateSW(true);
}
