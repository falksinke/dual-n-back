import { describe, expect, it } from 'vitest';
import {
    clampRestMinutes,
    loadRestMinutes,
    remainingRestSeconds,
    saveRestMinutes,
    startRestTimer,
} from './restTimer';

function memoryStorage() {
    const map = new Map<string, string>();
    return {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => map.set(key, value),
    };
}

describe('restTimer', () => {
    it('accepts only 0, 1, or 2 minutes', () => {
        expect(clampRestMinutes(0)).toBe(0);
        expect(clampRestMinutes(1)).toBe(1);
        expect(clampRestMinutes(2)).toBe(2);
        expect(clampRestMinutes(3)).toBe(0);
    });

    it('persists the selected duration', () => {
        const storage = memoryStorage();
        saveRestMinutes(2, storage);
        expect(loadRestMinutes(storage)).toBe(2);
    });

    it('counts down from a wall-clock deadline', () => {
        const timer = startRestTimer(1, 10_000);
        expect(remainingRestSeconds(timer, 10_000)).toBe(60);
        expect(remainingRestSeconds(timer, 69_001)).toBe(1);
        expect(remainingRestSeconds(timer, 70_000)).toBe(0);
    });

    it('treats zero minutes as immediately ready', () => {
        expect(startRestTimer(0, 10_000)).toEqual({ minutes: 0, endsAtMs: null });
    });
});
