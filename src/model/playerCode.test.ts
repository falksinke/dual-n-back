import { describe, expect, it } from 'vitest';
import {
    clearPlayerCode,
    loadPlayerCode,
    normalizePlayerCode,
    savePlayerCode,
    validatePlayerCode,
} from './playerCode';

function memoryStorage(initial: Record<string, string> = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
        removeItem: (key: string) => {
            map.delete(key);
        },
    };
}

describe('playerCode', () => {
    it('trims and validates length', () => {
        expect(normalizePlayerCode('  secret  ')).toBe('secret');
        expect(validatePlayerCode('short')).toMatch(/at least/);
        expect(validatePlayerCode('longenough')).toBeNull();
    });

    it('persists and clears the active code', () => {
        const storage = memoryStorage();
        savePlayerCode('my-player-code', storage);
        expect(loadPlayerCode(storage)).toBe('my-player-code');
        clearPlayerCode(storage);
        expect(loadPlayerCode(storage)).toBeNull();
    });
});
