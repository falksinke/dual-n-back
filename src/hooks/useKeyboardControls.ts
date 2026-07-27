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
                activeModalities,
                startGame,
                cancelGame,
                selectModality,
                decreaseLevel,
                increaseLevel,
                decreaseTrials,
                increaseTrials,
            } = useGameStore.getState();

            const modality = modalityFromKey(e.key, activeModalities);
            if (modality && game) {
                e.preventDefault();
                selectModality(modality);
                return;
            }

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    if (!game) decreaseLevel();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (!game) increaseLevel();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    if (!game) decreaseTrials();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (!game) increaseTrials();
                    break;
                case 'Escape':
                    if (game) {
                        e.preventDefault();
                        cancelGame();
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    if (game) {
                        cancelGame();
                    } else {
                        startGame();
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleKeydown);
        return () => document.removeEventListener('keydown', handleKeydown);
    }, []);
};
