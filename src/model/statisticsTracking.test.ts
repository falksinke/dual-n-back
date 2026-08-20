import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameResult } from './GameResult';
import { loadStatisticsHistory, STATISTICS_STORAGE_KEY } from './statistics';
import { bindStatisticsTracking, statisticsRoundFromResult } from './statisticsTracking';
import { useGameStore, type GameStore } from '../store/gameStore';

function result(): GameResult {
    return new GameResult(
        {
            position: { success: 8, failed: 2 },
            color: { success: 0, failed: 0 },
            image: { success: 0, failed: 0 },
            audio: { success: 7, failed: 3 },
        },
        ['position', 'audio'],
        null,
        null
    );
}

describe('statisticsRoundFromResult', () => {
    it('captures the completed round snapshot and calculated scores', () => {
        expect(
            statisticsRoundFromResult(
                result(),
                {
                    startedAt: new Date('2026-08-20T10:00:00.000Z'),
                    playMode: 'adaptive',
                    mode: 'dual',
                    nBack: 3,
                },
                'match',
                new Date('2026-08-20T10:01:30.000Z')
            )
        ).toEqual({
            id: '2026-08-20T10:01:30.000Z-dual-3',
            completedAt: '2026-08-20T10:01:30.000Z',
            durationMs: 90_000,
            playMode: 'adaptive',
            blockRole: 'match',
            mode: 'dual',
            nBack: 3,
            scorePct: 75,
            modalityScores: { position: 80, audio: 70 },
            variableN: null,
        });
    });

});

describe('bindStatisticsTracking', () => {
    beforeEach(() => {
        const storage = new Map<string, string>();
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
            removeItem: (key: string) => storage.delete(key),
        });
        useGameStore.setState({ results: { all: [], last: null }, lastBlockRole: null });
    });

    afterEach(() => {
        localStorage.removeItem(STATISTICS_STORAGE_KEY);
        useGameStore.setState({ results: { all: [], last: null }, lastBlockRole: null });
        vi.unstubAllGlobals();
    });

    it('persists each newly completed store result once', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-20T10:00:00.000Z'));
        const unbind = bindStatisticsTracking();
        const completed = result();

        useGameStore.setState({ game: {} as GameStore['game'] });
        vi.setSystemTime(new Date('2026-08-20T10:01:30.000Z'));
        useGameStore.setState({
            results: { all: [completed], last: completed },
            lastBlockRole: 'free',
            game: null,
        });
        useGameStore.setState({ countdown: null });

        expect(loadStatisticsHistory().rounds).toHaveLength(1);
        expect(loadStatisticsHistory().rounds[0]).toMatchObject({
            playMode: useGameStore.getState().settings.playMode,
            blockRole: 'free',
            scorePct: 75,
        });
        unbind();
        vi.useRealTimers();
    });
});
