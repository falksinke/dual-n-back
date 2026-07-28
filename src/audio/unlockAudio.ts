import { Howler } from 'howler';

type AudioSessionNavigator = Navigator & {
    audioSession?: { type: string };
};

/**
 * iOS / AirPods: Web Audio often stays silent after route changes or backgrounding
 * even when Spotify (native AVAudioSession) works. Prefer playback session + resume.
 */
export function preferPlaybackAudioSession(): void {
    if (typeof navigator === 'undefined') return;
    const session = (navigator as AudioSessionNavigator).audioSession;
    if (session && typeof session.type === 'string') {
        try {
            session.type = 'playback';
        } catch {
            // Older Safari — ignore.
        }
    }
}

export function resumeHowlerContext(): Promise<void> {
    const ctx = Howler.ctx as AudioContext | null | undefined;
    if (!ctx) return Promise.resolve();
    if (ctx.state === 'running') return Promise.resolve();
    return ctx.resume().then(
        () => undefined,
        () => undefined
    );
}

/** Call from a user gesture and before each SFX play. */
export function ensureAudioReady(): Promise<void> {
    preferPlaybackAudioSession();
    Howler.mute(false);
    return resumeHowlerContext();
}

let listenersBound = false;

/** Resume when returning from background / AirPods reconnect interruptions. */
export function bindAudioLifecycleResume(): void {
    if (typeof document === 'undefined' || listenersBound) return;
    listenersBound = true;

    const wake = () => {
        void ensureAudioReady();
    };

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') wake();
    });
    window.addEventListener('pageshow', wake);
    window.addEventListener('focus', wake);

    const ctx = Howler.ctx as AudioContext | null | undefined;
    ctx?.addEventListener?.('statechange', () => {
        if (Howler.ctx && Howler.ctx.state !== 'running') {
            void resumeHowlerContext();
        }
    });

    // First gesture unlocks Web Audio / HTML5 pool on iOS.
    const unlockOnce = () => {
        void ensureAudioReady();
        document.removeEventListener('pointerdown', unlockOnce, true);
        document.removeEventListener('keydown', unlockOnce, true);
    };
    document.addEventListener('pointerdown', unlockOnce, { capture: true, passive: true });
    document.addEventListener('keydown', unlockOnce, { capture: true });
}
