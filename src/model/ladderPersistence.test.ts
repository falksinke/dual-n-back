import { describe, expect, it } from 'vitest';
import { createDefaultCurriculumLadder } from './adaptiveCurriculum';
import {
    LADDER_STORAGE_KEY,
    LADDER_SCHEMA_VERSION,
    createDefaultLadderStorage,
    loadLadder,
    parseLadderStorage,
    saveLadder,
    type StorageLike,
} from './ladderPersistence';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => {
            map.set(key, value);
        },
    };
}

describe('ladderPersistence', () => {
    it('returns v3 curriculum defaults when storage is empty', () => {
        const storage = createMemoryStorage();
        const ladder = loadLadder(storage);
        expect(ladder.version).toBe(LADDER_SCHEMA_VERSION);
        expect(ladder.byMode.dual).toEqual(createDefaultCurriculumLadder());
        expect(ladder.byMode.triple).toEqual(createDefaultCurriculumLadder());
        expect(ladder.byMode.quad).toEqual(createDefaultCurriculumLadder());
    });

    it('round-trips save and load through mock storage', () => {
        const storage = createMemoryStorage();
        const saved = createDefaultLadderStorage();
        saved.byMode.dual = {
            ...createDefaultCurriculumLadder(),
            stage: 'fixed_fast',
            lureStage: 'E',
            isiTier: 1,
            failStreak: 2,
        };
        saved.byMode.triple = {
            ...createDefaultCurriculumLadder(),
            track: 'flexible',
            stage: 'flex_base',
            n: 3,
            lureStage: 'E',
        };

        saveLadder(saved, storage);
        const loaded = loadLadder(storage);

        expect(loaded).toEqual(saved);
        expect(storage.getItem(LADDER_STORAGE_KEY)).not.toBeNull();
    });

    it('returns defaults for corrupt JSON without throwing', () => {
        const storage = createMemoryStorage({ [LADDER_STORAGE_KEY]: '{not json' });
        expect(loadLadder(storage)).toEqual(createDefaultLadderStorage());
    });

    it('returns defaults for v2 Match-% schema (clean break)', () => {
        const storage = createMemoryStorage({
            [LADDER_STORAGE_KEY]: JSON.stringify({
                version: 2,
                byMode: { dual: { levelIndex: 5, failStreak: 1 } },
            }),
        });
        expect(loadLadder(storage)).toEqual(createDefaultLadderStorage());
    });

    it('merges partial byMode with defaults per mode', () => {
        const dual = {
            ...createDefaultCurriculumLadder(),
            stage: 'fixed_clean' as const,
            failStreak: 1,
        };
        const raw = JSON.stringify({
            version: LADDER_SCHEMA_VERSION,
            byMode: { dual },
        });
        const parsed = parseLadderStorage(raw);
        expect(parsed.byMode.dual).toEqual(dual);
        expect(parsed.byMode.triple).toEqual(createDefaultCurriculumLadder());
        expect(parsed.byMode.quad).toEqual(createDefaultCurriculumLadder());
    });

    it('normalizes invalid mode ladder fields to defaults', () => {
        const raw = JSON.stringify({
            version: LADDER_SCHEMA_VERSION,
            byMode: {
                dual: { track: 'nope', n: -3, stage: '???', failStreak: -1 },
            },
        });
        const parsed = parseLadderStorage(raw);
        expect(parsed.byMode.dual.track).toBe('fixed');
        expect(parsed.byMode.dual.n).toBe(2);
        expect(parsed.byMode.dual.stage).toBe('instruction');
        expect(parsed.byMode.dual.failStreak).toBe(0);
    });
});
