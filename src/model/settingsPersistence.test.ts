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
        expect(normalized.trials).toBe(4); // max(level, trials) — warm-up floor
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

    it('defaults stepwise pacing off and keeps explicit values', () => {
        expect(createDefaultPersistableSettings().stepwisePacing).toBe(false);
        expect(normalizePersistableSettings({}).stepwisePacing).toBe(false);
        expect(normalizePersistableSettings({ stepwisePacing: true }).stepwisePacing).toBe(true);
        expect(normalizePersistableSettings({ stepwisePacing: 'yes' }).stepwisePacing).toBe(false);
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

    it('persists Easy interference mode', () => {
        expect(normalizePersistableSettings({ interferenceChance: 'easy' }).interferenceChance).toBe(
            'easy'
        );
    });

    it('defaults and normalizes tripleModalities', () => {
        expect(normalizePersistableSettings({}).tripleModalities).toEqual([
            'position',
            'color',
            'audio',
        ]);
        expect(
            normalizePersistableSettings({
                tripleModalities: ['audio', 'image', 'color'],
            }).tripleModalities
        ).toEqual(['color', 'image', 'audio']);
        expect(
            normalizePersistableSettings({
                tripleModalities: ['position', 'audio'],
            }).tripleModalities
        ).toEqual(['position', 'color', 'audio']);
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

    it('defaults daily goal and free-play auto fields', () => {
        const normalized = normalizePersistableSettings({});
        expect(normalized.dailyRounds).toBe(20);
        expect(normalized.dailySessions).toBe(4);
        expect(normalized.freePlayAutoProgress).toBe(false);
        expect(normalized.freePlayPromotePct).toBe(80);
        expect(normalized.freePlayDemotePct).toBe(80);
        expect(normalized.freePlayFailsToDemote).toBe(3);
        expect(normalized.freePlayDemoteRequiresConsecutive).toBe(true);
        expect(normalized.freePlayFailStreak).toBe(0);
    });

    it('clamps invalid daily / auto-progress fields', () => {
        expect(normalizePersistableSettings({ dailyRounds: -1 }).dailyRounds).toBe(0);
        expect(normalizePersistableSettings({ dailyRounds: 999 }).dailyRounds).toBe(100);
        expect(normalizePersistableSettings({ dailySessions: 0 }).dailySessions).toBe(1);
        expect(normalizePersistableSettings({ freePlayPromotePct: 40 }).freePlayPromotePct).toBe(
            50
        );
        expect(normalizePersistableSettings({ freePlayDemotePct: -5 }).freePlayDemotePct).toBe(0);
        expect(normalizePersistableSettings({ freePlayFailsToDemote: 0 }).freePlayFailsToDemote).toBe(
            1
        );
    });

    it('round-trips through storage', () => {
        const storage = memoryStorage();
        const next = {
            ...createDefaultPersistableSettings(),
            mode: 'quad' as const,
            useJaeggiQuotas: false,
            dailyRounds: 16,
            freePlayAutoProgress: true,
            freePlayDemotePct: 65,
            freePlayDemoteRequiresConsecutive: false,
        };
        saveSettings(next, storage);
        expect(loadSettings(storage)).toEqual(next);
    });
});
