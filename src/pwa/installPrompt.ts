export type BeforeInstallPromptEventLike = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type DeferredListener = (event: BeforeInstallPromptEventLike | null) => void;

let deferred: BeforeInstallPromptEventLike | null = null;
const listeners = new Set<DeferredListener>();

function notify(event: BeforeInstallPromptEventLike | null) {
    for (const listener of listeners) {
        listener(event);
    }
}

/** Capture BIP for the page lifetime — call from bootstrap before React mounts. */
export function bindInstallPromptCapture() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferred = event as BeforeInstallPromptEventLike;
        notify(deferred);
    });
}

export function subscribeDeferredInstallPrompt(listener: DeferredListener): () => void {
    listeners.add(listener);
    listener(deferred);
    return () => {
        listeners.delete(listener);
    };
}

export function takeDeferredInstallPrompt(): BeforeInstallPromptEventLike | null {
    const next = deferred;
    deferred = null;
    notify(null);
    return next;
}

export function peekDeferredInstallPrompt(): BeforeInstallPromptEventLike | null {
    return deferred;
}
