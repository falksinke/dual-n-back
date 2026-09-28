import { describe, expect, it } from 'vitest';
import { nextTurn, ROTATION_CHANCE, TURNS, turnDurationMs } from './boardRotation';

const sequence = (...values: number[]) => {
    let i = 0;
    return () => values[i++ % values.length];
};

describe('rotating board', () => {
    it('stays put most of the time', () => {
        expect(nextTurn(sequence(ROTATION_CHANCE))).toBeNull();
        expect(nextTurn(sequence(0.99))).toBeNull();
    });

    it('turns by quarter, half or three-quarter turns in either direction', () => {
        const seen = new Set<number>();
        for (let k = 0; k < TURNS.length; k++) {
            seen.add(nextTurn(sequence(0, (k + 0.5) / TURNS.length))!);
        }
        expect([...seen].sort((a, b) => a - b)).toEqual([-270, -180, -90, 90, 180, 270]);
    });

    it('takes longer for bigger turns, whichever the direction', () => {
        expect(turnDurationMs(90)).toBeLessThan(turnDurationMs(180));
        expect(turnDurationMs(-270)).toBe(turnDurationMs(270));
        expect(turnDurationMs(270)).toBeLessThanOrEqual(500);
    });
});
