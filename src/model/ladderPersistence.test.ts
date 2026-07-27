import { describe, expect, it } from 'vitest';
import {
    LADDER_STORAGE_KEY,
    LADDER_SCHEMA_VERSION,
    createDefaultLadderStorage,
    isiMsFromTier,
    loadLadder,
    parseLadderStorage,
    saveLadder,
    type StorageLike,
} from './ladderPersistence';
import { DEFAULT_ISI_MAX_MS, DEFAULT_ISI_MIN_MS } from './isi';

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
    it('returns defaults when storage is empty', () => {
        const storage = createMemoryStorage();
        const ladder = loadLadder(storage);
        expect(ladder.version).toBe(LADDER_SCHEMA_VERSION);
        expect(ladder.byMode.dual).toEqual({ n: 2, lureStage: 'A', isiTier: 0 });
        expect(ladder.byMode.triple).toEqual({ n: 2, lureStage: 'A', isiTier: 0 });
        expect(ladder.byMode.quad).toEqual({ n: 2, lureStage: 'A', isiTier: 0 });
    });

    it('round-trips save and load through mock storage', () => {
        const storage = createMemoryStorage();
        const saved = createDefaultLadderStorage();
        saved.byMode.dual = { n: 4, lureStage: 'C', isiTier: 1 };
        saved.byMode.triple = { n: 3, lureStage: 'B', isiTier: 0 };

        saveLadder(saved, storage);
        const loaded = loadLadder(storage);

        expect(loaded).toEqual(saved);
        expect(storage.getItem(LADDER_STORAGE_KEY)).not.toBeNull();
    });

    it('returns defaults for corrupt JSON without throwing', () => {
        const storage = createMemoryStorage({ [LADDER_STORAGE_KEY]: '{not json' });
        expect(loadLadder(storage)).toEqual(createDefaultLadderStorage());
    });

    it('returns defaults for unknown schema version', () => {
        const storage = createMemoryStorage({
            [LADDER_STORAGE_KEY]: JSON.stringify({ version: 99, byMode: {} }),
        });
        expect(loadLadder(storage)).toEqual(createDefaultLadderStorage());
    });

    it('merges partial byMode with defaults per mode', () => {
        const raw = JSON.stringify({
            version: LADDER_SCHEMA_VERSION,
            byMode: {
                dual: { n: 5, lureStage: 'E', isiTier: 2 },
            },
        });
        const parsed = parseLadderStorage(raw);
        expect(parsed.byMode.dual).toEqual({ n: 5, lureStage: 'E', isiTier: 2 });
        expect(parsed.byMode.triple).toEqual({ n: 2, lureStage: 'A', isiTier: 0 });
        expect(parsed.byMode.quad).toEqual({ n: 2, lureStage: 'A', isiTier: 0 });
    });

    it('normalizes invalid mode ladder fields to defaults', () => {
        const raw = JSON.stringify({
            version: LADDER_SCHEMA_VERSION,
            byMode: {
                dual: { n: 1, lureStage: 'Z', isiTier: -1 },
            },
        });
        const parsed = parseLadderStorage(raw);
        expect(parsed.byMode.dual).toEqual({ n: 2, lureStage: 'A', isiTier: 0 });
    });

    it('maps ISI tiers to shorter fixed intervals', () => {
        expect(isiMsFromTier(0)).toEqual({
            isiMin: DEFAULT_ISI_MIN_MS,
            isiMax: DEFAULT_ISI_MAX_MS,
        });
        expect(isiMsFromTier(1)).toEqual({ isiMin: 2500, isiMax: 2500 });
        expect(isiMsFromTier(3)).toEqual({ isiMin: 1500, isiMax: 1500 });
    });
});
