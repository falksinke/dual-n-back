import { useEffect, useState } from 'react';
import { nextTurn, turnDurationMs } from '../../model/boardRotation';
import { useGameStore } from '../../store/gameStore';

export interface BoardRotation {
    /** Accumulated angle in degrees; never normalised, so each turn animates its own way. */
    angle: number;
    durationMs: number;
}

const STILL: BoardRotation = { angle: 0, durationMs: 0 };

/**
 * Turns the board right after a stimulus goes dark, so the spin happens in the
 * gap before the next one. Resets to upright at the start of every session.
 */
export function useBoardRotation(enabled: boolean): BoardRotation {
    const [rotation, setRotation] = useState<BoardRotation>(STILL);

    useEffect(() => {
        if (!enabled) {
            setRotation(STILL);
            return;
        }
        return useGameStore.subscribe((state, previous) => {
            if (state.game !== null && previous.game === null) {
                setRotation(STILL);
                return;
            }
            const stimulusEnded = state.boardState.positionIndex === -1 && previous.boardState.positionIndex >= 0;
            if (!stimulusEnded || state.game === null) return;
            const turn = nextTurn();
            if (turn === null) return;
            setRotation((current) => ({ angle: current.angle + turn, durationMs: turnDurationMs(turn) }));
        });
    }, [enabled]);

    return enabled ? rotation : STILL;
}
