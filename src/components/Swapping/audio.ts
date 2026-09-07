import { Howl } from 'howler';
import { ensureAudioReady } from '../../audio/unlockAudio';
import { getSoundSrc } from '../../model/audioPacks';

const CLIP_WATCHDOG_MS = 10_000;
const INTER_CLIP_GAP_MS = 300;
const PLAYBACK_ERROR = 'The letter audio could not be played. Retry or return to setup.';

export interface LetterPlayerCallbacks {
    onToken: (index: number) => void;
    onComplete: () => void;
    onError: (message: string) => void;
}

export interface LetterPlayer {
    play(tokens: readonly string[], callbacks: LetterPlayerCallbacks): void;
    cancel(): void;
    dispose(): void;
}

class HowlerLetterPlayer implements LetterPlayer {
    private generation = 0;
    private sound: Howl | null = null;
    private watchdog: ReturnType<typeof setTimeout> | null = null;
    private gap: ReturnType<typeof setTimeout> | null = null;
    private disposed = false;

    play(tokens: readonly string[], callbacks: LetterPlayerCallbacks): void {
        this.cancel();
        if (this.disposed) return;

        const generation = this.generation;
        if (tokens.length === 0) {
            callbacks.onComplete();
            return;
        }

        this.playClip(tokens, 0, callbacks, generation);
    }

    cancel(): void {
        this.generation += 1;
        this.clearTimers();
        this.releaseSound();
    }

    dispose(): void {
        this.cancel();
        this.disposed = true;
    }

    private playClip(
        tokens: readonly string[],
        index: number,
        callbacks: LetterPlayerCallbacks,
        generation: number
    ): void {
        if (!this.isCurrent(generation)) return;

        let loaded = false;
        let audioReady = false;
        let playRequested = false;
        let active = true;
        let sound: Howl | null = null;

        const fail = () => {
            if (!this.isCurrent(generation) || !active) return;
            // Successive clips share a pass generation. A queued event from an
            // already released clip must not fail the currently active clip.
            if (sound !== null && this.sound !== sound) return;
            active = false;
            this.generation += 1;
            this.clearTimers();
            this.releaseSound();
            callbacks.onError(PLAYBACK_ERROR);
        };

        const startWhenReady = () => {
            if (!this.isCurrent(generation) || !loaded || !audioReady || playRequested) return;
            playRequested = true;
            try {
                this.sound?.play();
            } catch {
                fail();
            }
        };

        // This covers unlock, loading, playback onset and playback completion.
        this.watchdog = setTimeout(fail, CLIP_WATCHDOG_MS);

        try {
            const createdSound = new Howl({
                src: getSoundSrc('letters', tokens[index]),
                html5: true,
                preload: true,
                onload: () => {
                    if (!active || !this.isCurrent(generation)) return;
                    if (sound !== null && this.sound !== sound) return;
                    loaded = true;
                    startWhenReady();
                },
                onplay: () => {
                    if (!active || !this.isCurrent(generation) || this.sound !== sound) return;
                    callbacks.onToken(index);
                },
                onend: () => {
                    if (!active || !this.isCurrent(generation) || this.sound !== sound) return;
                    active = false;
                    this.clearWatchdog();
                    this.releaseSound();

                    if (index === tokens.length - 1) {
                        callbacks.onComplete();
                        return;
                    }

                    this.gap = setTimeout(() => {
                        this.gap = null;
                        this.playClip(tokens, index + 1, callbacks, generation);
                    }, INTER_CLIP_GAP_MS);
                },
                onloaderror: fail,
                onplayerror: fail,
            });
            sound = createdSound;
            // A constructor callback may fail synchronously before the newly
            // created sound can be assigned to this instance.
            if (!active || !this.isCurrent(generation)) {
                createdSound.off();
                createdSound.stop();
                createdSound.unload();
                return;
            }
            this.sound = createdSound;
            if (createdSound.state() === 'loaded') loaded = true;
        } catch {
            fail();
            return;
        }

        // Arm the timeout above before waiting for browser audio readiness.
        void ensureAudioReady().then(
            () => {
                if (!this.isCurrent(generation)) return;
                audioReady = true;
                startWhenReady();
            },
            fail
        );
        startWhenReady();
    }

    private isCurrent(generation: number): boolean {
        return !this.disposed && generation === this.generation;
    }

    private clearTimers(): void {
        this.clearWatchdog();
        if (this.gap !== null) {
            clearTimeout(this.gap);
            this.gap = null;
        }
    }

    private clearWatchdog(): void {
        if (this.watchdog !== null) {
            clearTimeout(this.watchdog);
            this.watchdog = null;
        }
    }

    private releaseSound(): void {
        const sound = this.sound;
        this.sound = null;
        if (!sound) return;

        sound.off();
        sound.stop();
        sound.unload();
    }
}

export function createLetterPlayer(): LetterPlayer {
    return new HowlerLetterPlayer();
}
