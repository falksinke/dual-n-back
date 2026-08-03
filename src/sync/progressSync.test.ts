import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { savePlayerCode } from '../model/playerCode';
import { createDefaultProgressDocument } from '../model/progressDocument';
import { applyPlayerCode, getSyncStatus, pushProgress } from '../sync/progressSync';
import { useGameStore } from '../store/gameStore';
import { createDefaultFreePlaySettings } from '../store/gameStore';

function memoryStorage() {
    const map = new Map<string, string>();
    return {
        getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
        removeItem: (key: string) => {
            map.delete(key);
        },
        clear: () => map.clear(),
    };
}

describe('progressSync', () => {
    const storage = memoryStorage();

    beforeEach(() => {
        storage.clear();
        vi.stubGlobal('localStorage', storage);
        useGameStore.setState({
            settings: createDefaultFreePlaySettings(),
            ladder: {
                dual: {
                    track: 'fixed',
                    n: 2,
                    stage: 'instruction',
                    lureStage: 'A',
                    isiTier: 0,
                    failStreak: 0,
                    promoteStreak: 0,
                },
                triple: {
                    track: 'fixed',
                    n: 2,
                    stage: 'instruction',
                    lureStage: 'A',
                    isiTier: 0,
                    failStreak: 0,
                    promoteStreak: 0,
                },
                quad: {
                    track: 'fixed',
                    n: 2,
                    stage: 'instruction',
                    lureStage: 'A',
                    isiTier: 0,
                    failStreak: 0,
                    promoteStreak: 0,
                },
            },
            game: null,
            countdown: null,
        });
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.reject(new Error('fetch not mocked')))
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('seeds the server when the player code is new (404)', async () => {
        const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const method = init?.method ?? 'GET';
            if (method === 'GET') {
                return new Response(JSON.stringify({ error: 'missing' }), { status: 404 });
            }
            const body = createDefaultProgressDocument('2026-07-31T10:00:00.000Z');
            return new Response(JSON.stringify(body), { status: 200 });
        });
        vi.stubGlobal('fetch', fetchMock);

        await applyPlayerCode('fresh-code');

        expect(fetchMock).toHaveBeenCalled();
        expect(getSyncStatus().kind).toBe('linked');
        expect(storage.getItem('nback-player-code')).toBe('fresh-code');
    });

    it('hydrates from an existing cloud save', async () => {
        const remote = createDefaultProgressDocument('2026-07-31T11:00:00.000Z');
        remote.settings.mode = 'triple';
        remote.settings.level = 5;
        remote.ladder.byMode.dual = {
            track: 'fixed',
            n: 3,
            stage: 'fixed_clean',
            lureStage: 'A',
            isiTier: 0,
            failStreak: 0,
            promoteStreak: 0,
        };

        const fetchMock = vi.fn(async () => {
            return new Response(JSON.stringify(remote), { status: 200 });
        });
        vi.stubGlobal('fetch', fetchMock);

        await applyPlayerCode('shared-code');

        expect(useGameStore.getState().settings.mode).toBe('triple');
        expect(useGameStore.getState().settings.level).toBe(5);
        expect(useGameStore.getState().ladder.dual.n).toBe(3);
        expect(useGameStore.getState().ladder.dual.stage).toBe('fixed_clean');
        expect(getSyncStatus().kind).toBe('linked');
    });

    it('pushes when a code is linked', async () => {
        savePlayerCode('linked-code', storage);
        const fetchMock = vi.fn(async () => {
            return new Response(
                JSON.stringify(createDefaultProgressDocument('2026-07-31T12:00:00.000Z')),
                { status: 200 }
            );
        });
        vi.stubGlobal('fetch', fetchMock);

        await pushProgress();

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/progress',
            expect.objectContaining({ method: 'PUT' })
        );
        expect(getSyncStatus()).toMatchObject({ kind: 'linked' });
    });
});
