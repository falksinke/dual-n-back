import { describe, expect, it } from 'vitest';
import {
    decideProgression,
    levelAt,
    maxLevelIndex,
    PROGRESS_INTERFERENCE_ON,
    PROGRESS_MAX_N,
    settingsFromLevel,
    STEPS_PER_N,
} from './adaptiveLevels';

describe('adaptiveLevels', () => {
    it('builds the n=2 recipe shape', () => {
        expect(levelAt(0)).toEqual({
            n: 2,
            isiMin: 2500,
            isiMax: 2500,
            interferenceChance: 0,
            variableN: false,
        });
        expect(levelAt(1)).toMatchObject({
            n: 2,
            isiMin: 2500,
            isiMax: 2500,
            interferenceChance: PROGRESS_INTERFERENCE_ON,
            variableN: false,
        });
        expect(levelAt(5)).toEqual({
            n: 2,
            isiMin: 900,
            isiMax: 1100,
            interferenceChance: PROGRESS_INTERFERENCE_ON,
            variableN: false,
        });
        expect(levelAt(6)).toMatchObject({
            n: 2,
            isiMin: 2000,
            isiMax: 2000,
            variableN: true,
            interferenceChance: PROGRESS_INTERFERENCE_ON,
        });
        expect(levelAt(9)).toEqual({
            n: 2,
            isiMin: 900,
            isiMax: 1100,
            interferenceChance: PROGRESS_INTERFERENCE_ON,
            variableN: true,
        });
    });

    it('starts n=3 after completing the n=2 cycle', () => {
        expect(levelAt(10)).toEqual({
            n: 3,
            isiMin: 2500,
            isiMax: 2500,
            interferenceChance: 0,
            variableN: false,
        });
        expect(settingsFromLevel(10)).toEqual(levelAt(10));
    });

    it('caps at PROGRESS_MAX_N', () => {
        const last = levelAt(maxLevelIndex());
        expect(last.n).toBe(PROGRESS_MAX_N);
        expect(maxLevelIndex()).toBe((PROGRESS_MAX_N - 2) * STEPS_PER_N + (STEPS_PER_N - 1));
        expect(levelAt(maxLevelIndex() + 50).n).toBe(PROGRESS_MAX_N);
    });

    it('promotes at 80% and resets fail streak', () => {
        expect(
            decideProgression({ levelIndex: 2, failStreak: 2, matchPct: 80 })
        ).toEqual({
            action: 'promote',
            levelIndex: 3,
            failStreak: 0,
            reason: expect.stringContaining('promote'),
        });
    });

    it('holds below 80% and increments fail streak', () => {
        expect(
            decideProgression({ levelIndex: 2, failStreak: 0, matchPct: 79 })
        ).toEqual({
            action: 'hold',
            levelIndex: 2,
            failStreak: 1,
            reason: expect.stringContaining('fail 1/3'),
        });
    });

    it('demotes on the third consecutive fail and resets streak', () => {
        expect(
            decideProgression({ levelIndex: 4, failStreak: 2, matchPct: 50 })
        ).toEqual({
            action: 'demote',
            levelIndex: 3,
            failStreak: 0,
            reason: expect.stringContaining('demote'),
        });
    });

    it('does not demote below level 0', () => {
        expect(
            decideProgression({ levelIndex: 0, failStreak: 2, matchPct: 10 })
        ).toEqual({
            action: 'hold',
            levelIndex: 0,
            failStreak: 0,
            reason: expect.stringContaining('minimum'),
        });
    });

    it('does not promote past max level', () => {
        const max = maxLevelIndex();
        expect(
            decideProgression({ levelIndex: max, failStreak: 1, matchPct: 95 })
        ).toEqual({
            action: 'hold',
            levelIndex: max,
            failStreak: 0,
            reason: expect.stringContaining('max level'),
        });
    });
});
