import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { modalityFromKey } from '../model/modalities';

export const useKeyboardControls = () => {
    useEffect(() => {
        const handleKeydown = (e: KeyboardEvent): void => {
            const target = e.target;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && target.isContentEditable)
            ) {
                return;
            }

            const {
                game,
                countdown,
                activeModalities,
                adaptiveSession,
                settings,
                startGame,
                cancelGame,
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

            // Settings dialog owns the keyboard while open (Space would otherwise
            // start a round behind the overlay — audio plays, board stays hidden).
            if (document.querySelector('.settings-shell.is-open')) {
                return;
            }

            switch (e.key) {
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
                    // Key-repeat would start then immediately cancel during countdown.
                    if (e.repeat) {
                        e.preventDefault();
                        break;
                    }
                    e.preventDefault();
                    if (interstitialContinue) {
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
    }, []);
};
