import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameResult } from './GameResult';
import type { GameDebugLog } from './gameDebugLog';
import { loadStatisticsHistory, STATISTICS_STORAGE_KEY } from './statistics';
import { bindStatisticsTracking, statisticsRoundFromResult } from './statisticsTracking';
import { useGameStore } from '../store/gameStore';

const debugLog: GameDebugLog = {
    schemaVersion: 1,
    startedAt: '2026-08-20T10:00:00.000Z',
    completedAt: '2026-08-20T10:01:30.000Z',
    durationMs: 90_000,
    config: {
        level: 3,
        trials: 20,
        isiMinMs: 2500,
        isiMaxMs: 3000,
        answerGraceMs: 250,
        mode: 'dual',
        modalities: ['position', 'audio'],
        positionGrid: '3x3',
        allowCenterStimulus: false,
        variableN: false,
        variableNHoldTrials: 1,
        interferenceChance: 0.125,
        lureStage: null,
        useBlockQuotas: false,
        useJaeggiQuotas: true,
    },
    trials: [],
};

function result(): GameResult {
    return new GameResult(
        {
            position: { success: 8, failed: 2 },
            audio: { success: 7, failed: 3 },
        },
        ['position', 'audio'],
        null,
        null,
        debugLog
    );
}

describe('statisticsRoundFromResult', () => {
    it('captures the completed round snapshot and calculated scores', () => {
        expect(statisticsRoundFromResult(result(), 'adaptive', 'match')).toEqual({
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

    it('does not invent metadata for results without a debug snapshot', () => {
        const legacy = new GameResult(
            { position: { success: 1, failed: 0 }, audio: { success: 1, failed: 0 } },
            ['position', 'audio']
        );
        expect(statisticsRoundFromResult(legacy, 'free', 'free')).toBeNull();
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
        const unbind = bindStatisticsTracking();
        const completed = result();

        useGameStore.setState({
            results: { all: [completed], last: completed },
            lastBlockRole: 'free',
        });
        useGameStore.setState({ countdown: null });

        expect(loadStatisticsHistory().rounds).toHaveLength(1);
        expect(loadStatisticsHistory().rounds[0]).toMatchObject({
            playMode: useGameStore.getState().settings.playMode,
            blockRole: 'free',
            scorePct: 75,
        });
        unbind();
    });
});
