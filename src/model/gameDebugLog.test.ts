import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    downloadGameDebugLog,
    gameDebugLogFilename,
    serializeGameDebugLog,
    type GameDebugLog,
} from './gameDebugLog';

const log: GameDebugLog = {
    schemaVersion: 1,
    startedAt: '2026-08-12T12:34:56.789Z',
    completedAt: '2026-08-12T12:35:26.789Z',
    durationMs: 30_000,
    config: {
        level: 5,
        trials: 1,
        isiMinMs: 1000,
        isiMaxMs: 1500,
        answerGraceMs: 250,
        mode: 'dual',
        modalities: ['position', 'audio'],
        positionGrid: '3x3',
        allowCenterStimulus: false,
        variableN: true,
        variableNHoldTrials: 1,
        interferenceChance: 0.125,
        lureStage: null,
        useBlockQuotas: false,
        useJaeggiQuotas: true,
    },
    trials: [],
};

describe('gameDebugLog', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });
    it('serializes readable versioned JSON', () => {
        const serialized = serializeGameDebugLog(log);
        expect(serialized.endsWith('\n')).toBe(true);
        expect(JSON.parse(serialized)).toMatchObject({
            schemaVersion: 1,
            config: { level: 5, variableN: true },
        });
    });

    it('uses a filesystem-safe timestamp in the download name', () => {
        expect(gameDebugLogFilename(log)).toBe(
            'nback-debug-2026-08-12T12-34-56-789Z.json'
        );
    });

    it('downloads the serialized log through a named JSON anchor', () => {
        vi.useFakeTimers();
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => undefined);
        const createObjectURL = vi.fn(() => 'blob:nback-debug');
        const revokeObjectURL = vi.fn();
        vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

        downloadGameDebugLog(log);

        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(click).toHaveBeenCalledTimes(1);
        expect(document.querySelector('a[download]')).toBeNull();
        expect(revokeObjectURL).not.toHaveBeenCalled();

        vi.advanceTimersByTime(60_000);
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:nback-debug');
    });
});
