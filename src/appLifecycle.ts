import {
    resumeAudioFromBackground,
    suspendAudioForBackground,
} from './audio/unlockAudio';
import {
    pauseCountdownForBackground,
    resumeCountdownForBackground,
    useGameStore,
} from './store/gameStore';
import { clearStimulusTimers } from './store/stimulusPresentation';
import { pullIfNewer } from './sync/progressSync';

let bound = false;
let sessionSuspended = false;

function pauseSessionForBackground(): void {
    if (sessionSuspended) return;
    sessionSuspended = true;

    suspendAudioForBackground();
    clearStimulusTimers();
    pauseCountdownForBackground();

    const game = useGameStore.getState().game;
    if (game && typeof game.pause === 'function') {
        game.pause();
    }
}

function resumeSessionFromBackground(): void {
    if (!sessionSuspended) return;
    sessionSuspended = false;

    resumeAudioFromBackground();
    resumeCountdownForBackground(useGameStore.getState, useGameStore.setState);

    // Paced mode keeps its user gate across background/foreground — resuming
    // here would auto-continue the held trial without Space.
    const state = useGameStore.getState();
    const game = state.game;
    if (game && typeof game.resume === 'function' && !state.stepwisePaused) {
        game.resume();
    }
}

/**
 * Pause in-progress play (trial clock + audio + countdown) when the app is
 * backgrounded — critical on iPhone PWA / Home Screen where timers keep firing.
 */
export function bindAppLifecyclePause(): void {
    if (typeof document === 'undefined' || bound) return;
    bound = true;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            pauseSessionForBackground();
        } else {
            useGameStore.getState().ensureDailyProgressCurrent();
            void pullIfNewer();
            resumeSessionFromBackground();
        }
    });

    // Only pause on pagehide when the page is actually hidden. Some WebKit paths
    // fire pagehide while still "visible", which used to leave Howler muted.
    window.addEventListener('pagehide', () => {
        if (document.visibilityState === 'hidden') {
            pauseSessionForBackground();
        }
    });
    window.addEventListener('freeze', pauseSessionForBackground);

    window.addEventListener('pageshow', () => {
        if (document.visibilityState === 'visible') {
            useGameStore.getState().ensureDailyProgressCurrent();
            void pullIfNewer();
            resumeSessionFromBackground();
        }
    });
}
