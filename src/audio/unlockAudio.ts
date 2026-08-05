import { Howler } from 'howler';

type AudioSessionNavigator = Navigator & {
    audioSession?: { type: string };
};

let audioSuspendedForBackground = false;

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

/**
 * Clear a stuck background-mute flag when the document is clearly foreground.
 * pagehide / visibility races can leave audio muted after the tab is visible again.
 */
export function clearStuckBackgroundAudioMute(): boolean {
    if (
        !audioSuspendedForBackground ||
        typeof document === 'undefined' ||
        document.visibilityState !== 'visible'
    ) {
        return false;
    }
    audioSuspendedForBackground = false;
    return true;
}

/** Call from a user gesture and before each SFX play. */
export function ensureAudioReady(): Promise<void> {
    clearStuckBackgroundAudioMute();
    if (audioSuspendedForBackground) return Promise.resolve();
    preferPlaybackAudioSession();
    Howler.mute(false);
    return resumeHowlerContext();
}

/** Mute + stop playback when the app is backgrounded (iPhone Home / app switcher). */
export function suspendAudioForBackground(): void {
    audioSuspendedForBackground = true;
    try {
        Howler.stop();
    } catch {
        // Howler may not be fully initialized yet.
    }
    Howler.mute(true);
    const ctx = Howler.ctx as AudioContext | null | undefined;
    if (ctx && ctx.state === 'running' && typeof ctx.suspend === 'function') {
        void ctx.suspend().then(
            () => undefined,
            () => undefined
        );
    }
}

/** Undo {@link suspendAudioForBackground} when returning to the foreground. */
export function resumeAudioFromBackground(): void {
    audioSuspendedForBackground = false;
    void ensureAudioReady();
}

export function isAudioSuspendedForBackground(): boolean {
    return audioSuspendedForBackground;
}

let listenersBound = false;

/** Resume when returning from background / AirPods reconnect interruptions. */
export function bindAudioLifecycleResume(): void {
    if (typeof document === 'undefined' || listenersBound) return;
    listenersBound = true;

    const wake = () => {
        if (audioSuspendedForBackground) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        void ensureAudioReady();
    };

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') wake();
    });
    window.addEventListener('pageshow', wake);
    window.addEventListener('focus', wake);

    const ctx = Howler.ctx as AudioContext | null | undefined;
    ctx?.addEventListener?.('statechange', () => {
        if (audioSuspendedForBackground) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        if (Howler.ctx && Howler.ctx.state !== 'running') {
            void resumeHowlerContext();
        }
    });

    // First gesture unlocks Web Audio / HTML5 pool on iOS.
    // Keep listening — a single early gesture during a stuck mute would otherwise
    // remove the unlock handler before audio can actually arm.
    const unlockOnGesture = () => {
        void ensureAudioReady();
    };
    document.addEventListener('pointerdown', unlockOnGesture, { capture: true, passive: true });
    document.addEventListener('keydown', unlockOnGesture, { capture: true });
}
