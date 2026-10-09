import { useMountEffect } from './useMountEffect';
import { useGameStore } from '../store/gameStore';
import { modalityFromKey } from '../model/modalities';

export const useKeyboardControls = () => {
    useMountEffect(() => {
        const handleKeydown = (e: KeyboardEvent): void => {
            if (e.defaultPrevented) return;
            const target = e.target;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && target.isContentEditable)
            ) {
                return;
            }

            // Any open modal owns the keyboard (Settings, Strategy, TeachOptOut
            // all mark their container via useModalA11y).
            if (document.querySelector('[data-modal-open]')) {
                return;
            }

            const {
                game,
                countdown,
                activeModalities,
                adaptiveSession,
                settings,
                stepwisePaused,
                startGame,
                skipCountdown,
                cancelGame,
                continueStepwise,
                toggleMemoryPreview,
                selectModality,
                decreaseLevel,
                increaseLevel,
                decreaseTrials,
                increaseTrials,
            } = useGameStore.getState();

            const inSession = game !== null;
            const countingDown = countdown !== null;
            const interstitialContinue = adaptiveSession?.pendingContinue === true;
            const busy = inSession || countingDown;
            const adaptiveIdle =
                (settings.playMode === 'adaptive' || settings.playMode === 'cyclic') &&
                !busy &&
                !interstitialContinue;

            const modality = modalityFromKey(e.key, activeModalities);
            if (modality && inSession) {
                e.preventDefault();
                selectModality(modality);
                return;
            }

            switch (e.key) {
                case 'm':
                case 'M':
                    if (
                        inSession && activeModalities.includes('position') &&
                        !e.altKey && !e.ctrlKey && !e.metaKey
                    ) {
                        e.preventDefault();
                        if (!e.repeat) toggleMemoryPreview();
                    }
                    break;
                case 'n':
                case 'N':
                    if (inSession && stepwisePaused && !e.altKey && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        if (!e.repeat) continueStepwise();
                    }
                    break;
                case 'Enter':
                    // Let focused controls keep their native activation behavior.
                    if (target instanceof HTMLElement && target.closest('button, a, select')) return;
                    e.preventDefault();
                    if (!e.repeat && !busy) startGame();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (!busy && !adaptiveIdle) decreaseLevel();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (!busy && !adaptiveIdle) increaseLevel();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (!busy) decreaseTrials();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (!busy) increaseTrials();
                    break;
                case 'Escape':
                    // Abort in-flight play/countdown, or leave an Adaptive interstitial.
                    if (busy || interstitialContinue) {
                        e.preventDefault();
                        cancelGame();
                    }
                    break;
                case ' ':
                    // Holding Space must not skip the countdown or submit a match.
                    if (e.repeat) {
                        e.preventDefault();
                        break;
                    }
                    e.preventDefault();
                    if (countingDown) {
                        skipCountdown();
                    } else if (inSession && settings.mode === 'single') {
                        const singleModality = activeModalities[0];
                        if (singleModality) selectModality(singleModality);
                    } else if (inSession && stepwisePaused) {
                        // Paced mode: Space is the continue gate, not an abort.
                        continueStepwise();
                    } else if (interstitialContinue) {
                        startGame();
                    } else if (inSession) {
                        cancelGame();
                    } else if (!countingDown) {
                        startGame();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    });
};
