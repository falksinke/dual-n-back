import { describe, expect, it } from 'vitest';
import { createDefaultCurriculumLadder } from './adaptiveCurriculum';
import { createDefaultMatchLadder } from './ladderPersistence';
import {
    ADAPTIVE_LADDER_STORAGE_KEY,
    CYCLIC_LADDER_STORAGE_KEY,
    createDefaultAdaptiveLadderStorage,
    createDefaultCyclicLadderStorage,
    loadAdaptiveLadder,
    loadCyclicLadder,
    parseAdaptiveLadderStorage,
    parseCyclicLadderStorage,
    saveAdaptiveLadder,
    saveCyclicLadder,
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
    it('returns Match% v2 and cyclic v4 defaults when storage is empty', () => {
        const storage = createMemoryStorage();
        expect(loadAdaptiveLadder(storage)).toEqual(createDefaultAdaptiveLadderStorage());
        expect(loadCyclicLadder(storage)).toEqual(createDefaultCyclicLadderStorage());
    });

    it('round-trips Match% and cyclic ladders independently', () => {
        const storage = createMemoryStorage();
        const adaptive = createDefaultAdaptiveLadderStorage();
        adaptive.byMode.dual = { levelIndex: 5, failStreak: 2 };
        const cyclic = createDefaultCyclicLadderStorage();
        cyclic.byMode.dual = {
            ...createDefaultCurriculumLadder(),
            stage: 'fixed_fast',
            lureStage: 'E',
            isiTier: 1,
            failStreak: 1,
        };

        saveAdaptiveLadder(adaptive, storage);
        saveCyclicLadder(cyclic, storage);

        expect(loadAdaptiveLadder(storage)).toEqual(adaptive);
        expect(loadCyclicLadder(storage)).toEqual(cyclic);
        expect(storage.getItem(ADAPTIVE_LADDER_STORAGE_KEY)).not.toBeNull();
        expect(storage.getItem(CYCLIC_LADDER_STORAGE_KEY)).not.toBeNull();
    });

    it('migrates a v3 blob under the adaptive key into the cyclic key', () => {
        const curriculum = createDefaultCyclicLadderStorage();
        curriculum.byMode.dual = {
            ...createDefaultCurriculumLadder(),
            stage: 'fixed_clean',
            failStreak: 1,
        };
        const storage = createMemoryStorage({
            [ADAPTIVE_LADDER_STORAGE_KEY]: JSON.stringify(curriculum),
        });

        const adaptive = loadAdaptiveLadder(storage);
        expect(adaptive).toEqual(createDefaultAdaptiveLadderStorage());
        expect(loadCyclicLadder(storage).byMode.dual.stage).toBe('fixed_clean');
        expect(JSON.parse(storage.getItem(ADAPTIVE_LADDER_STORAGE_KEY)!).version).toBe(2);
    });

    it('parses classic Match% v2 storage', () => {
        const raw = JSON.stringify({
            version: 2,
            byMode: { dual: { levelIndex: 5, failStreak: 1 } },
        });
        expect(parseAdaptiveLadderStorage(raw).byMode.dual).toEqual({
            levelIndex: 5,
            failStreak: 1,
        });
        expect(parseAdaptiveLadderStorage(raw).byMode.triple).toEqual(createDefaultMatchLadder());
    });

    it('ignores curriculum-shaped adaptive key without writing cyclic when already present', () => {
        const existing = createDefaultCyclicLadderStorage();
        existing.byMode.dual = {
            ...createDefaultCurriculumLadder(),
            stage: 'fade',
        };
        const storage = createMemoryStorage({
            [ADAPTIVE_LADDER_STORAGE_KEY]: JSON.stringify(createDefaultCyclicLadderStorage()),
            [CYCLIC_LADDER_STORAGE_KEY]: JSON.stringify(existing),
        });
        loadAdaptiveLadder(storage);
        expect(loadCyclicLadder(storage).byMode.dual.stage).toBe('teach_ramp');
    });

    it('migrates legacy fade stage to teach_ramp on load', () => {
        const storage = createMemoryStorage({
            [CYCLIC_LADDER_STORAGE_KEY]: JSON.stringify({
                version: 3,
                byMode: {
                    dual: {
                        track: 'fixed',
                        n: 2,
                        stage: 'fade',
                        lureStage: 'A',
                        isiTier: 0,
                        failStreak: 0,
                        promoteStreak: 0,
                    },
                },
            }),
        });
        expect(loadCyclicLadder(storage).byMode.dual.stage).toBe('teach_ramp');
        expect(loadCyclicLadder(storage).version).toBe(4);
    });

    it('returns defaults for corrupt JSON without throwing', () => {
        const storage = createMemoryStorage({ [CYCLIC_LADDER_STORAGE_KEY]: '{not json' });
        expect(loadCyclicLadder(storage)).toEqual(createDefaultCyclicLadderStorage());
        expect(parseCyclicLadderStorage('{')).toEqual(createDefaultCyclicLadderStorage());
    });
});
