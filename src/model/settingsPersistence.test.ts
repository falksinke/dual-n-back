import { describe, expect, it } from 'vitest';
import {
    createDefaultPersistableSettings,
    loadSettings,
    normalizePersistableSettings,
    saveSettings,
} from './settingsPersistence';

function memoryStorage(initial: Record<string, string> = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
    };
}

describe('settingsPersistence', () => {
    it('normalizes unknown payloads to defaults', () => {
        const normalized = normalizePersistableSettings({ mode: 'triple', level: 4, trials: 1 });
        expect(normalized.mode).toBe('triple');
        expect(normalized.level).toBe(4);
        expect(normalized.trials).toBe(8); // max(level*2, trials)
        expect(normalized.playMode).toBe('free');
        expect(normalized.variableNHoldTrials).toBe(1);
    });

    it('normalizes variable N hold trials', () => {
        const normalized = normalizePersistableSettings({ variableNHoldTrials: 5 });
        expect(normalized.variableNHoldTrials).toBe(5);
        expect(normalizePersistableSettings({ variableNHoldTrials: 4 }).variableNHoldTrials).toBe(
            3
        );
    });

    it('normalizes answer grace to the slider ladder', () => {
        expect(normalizePersistableSettings({ answerGraceMs: 300 }).answerGraceMs).toBe(300);
        expect(normalizePersistableSettings({ answerGraceMs: 275 }).answerGraceMs).toBe(300);
        expect(normalizePersistableSettings({ answerGraceMs: 999 }).answerGraceMs).toBe(500);
        expect(normalizePersistableSettings({}).answerGraceMs).toBe(250);
    });

    it('clears displayVariableNCenter when center cell is on', () => {
        const normalized = normalizePersistableSettings({
            allowCenterStimulus: true,
            displayVariableNCenter: true,
        });
        expect(normalized.allowCenterStimulus).toBe(true);
        expect(normalized.displayVariableNCenter).toBe(false);
        expect(
            normalizePersistableSettings({
                allowCenterStimulus: false,
                displayVariableNCenter: true,
            }).displayVariableNCenter
        ).toBe(true);
    });

    it('defaults positionGrid to 3x3 and clears N-in-center on 2x2', () => {
        expect(normalizePersistableSettings({}).positionGrid).toBe('3x3');
        expect(normalizePersistableSettings({ positionGrid: '2x2' }).positionGrid).toBe('2x2');
        expect(
            normalizePersistableSettings({
                positionGrid: '2x2',
                displayVariableNCenter: true,
            }).displayVariableNCenter
        ).toBe(false);
        expect(normalizePersistableSettings({ positionGrid: '5x5' }).positionGrid).toBe('3x3');
    });

    it('round-trips through storage', () => {
        const storage = memoryStorage();
        const next = {
            ...createDefaultPersistableSettings(),
            mode: 'quad' as const,
            useJaeggiQuotas: false,
        };
        saveSettings(next, storage);
        expect(loadSettings(storage)).toEqual(next);
    });
});
