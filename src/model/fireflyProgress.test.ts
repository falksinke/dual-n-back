import { describe, expect, it } from 'vitest';
import {
    createDefaultFireflyProgress,
    loadFireflyProgress,
    newerFireflyProgress,
    normalizeFireflyProgress,
    saveFireflyProgress,
} from './fireflyProgress';

function memoryStorage(): Storage {
    const values = new Map<string, string>();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => { values.set(key, value); },
        removeItem: (key) => { values.delete(key); },
        clear: () => { values.clear(); },
        key: (index) => [...values.keys()][index] ?? null,
        get length() { return values.size; },
    };
}

describe('Firefly Post progress', () => {
    it('keeps settings and a resumable Endback route separate for each profile', () => {
        const storage = memoryStorage();
        const saved = createDefaultFireflyProgress();
        saved.updatedAt = '2026-09-28T10:00:00.000Z';
        saved.settings = { ...saved.settings, length: 4, endback: true, hiddenCount: 2,
            hiddenPlacement: 'random', isiMs: 1250, increaseSpeed: false };
        saved.route = { streak: 3, sequence: [1, 2, 3, 5], hiddenPositions: [0, 2],
            history: [0, 1, 2, 3], itemMs: 1250 };

        saveFireflyProgress('Falk', saved, false, storage);

        expect(loadFireflyProgress('Falk', storage)).toEqual(saved);
        expect(loadFireflyProgress('Other', storage)).toEqual(createDefaultFireflyProgress());
        expect(loadFireflyProgress(null, storage)).toEqual(createDefaultFireflyProgress());
        saveFireflyProgress('local', saved, false, storage);
        expect(loadFireflyProgress('local', storage)).toEqual(saved);
        expect(loadFireflyProgress(null, storage)).toEqual(createDefaultFireflyProgress());
    });

    it('rejects an invalid route and clamps legacy or malformed settings to safe defaults', () => {
        const normalized = normalizeFireflyProgress({
            settings: { length: 4, middleWindowEnabled: false, endback: true,
                hiddenCount: 99, isiMs: 50 },
            route: { streak: -1, sequence: [1, 2, 4, 5], hiddenPositions: [0, 7], itemMs: 50 },
        });

        expect(normalized.settings.hiddenCount).toBe(1);
        expect(normalized.settings.isiMs).toBe(1000);
        expect(normalized.route.sequence).toEqual([]);
        expect(normalized.route.hiddenPositions).toEqual([]);
        expect(normalized.route.streak).toBe(0);
        expect(normalized.route.itemMs).toBe(1000);
    });

    it('uses the newest Firefly checkpoint when a profile document is merged', () => {
        const local = { ...createDefaultFireflyProgress(), updatedAt: '2026-09-28T10:00:02.000Z' };
        const remote = { ...createDefaultFireflyProgress(), updatedAt: '2026-09-28T10:00:01.000Z' };

        expect(newerFireflyProgress(local, remote)).toBe(local);
        expect(newerFireflyProgress(remote, local)).toBe(local);
    });
});
