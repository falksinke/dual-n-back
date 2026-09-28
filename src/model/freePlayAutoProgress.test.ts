import { describe, expect, it } from 'vitest';
import { decideFreePlayLevelProgression } from './freePlayAutoProgress';

describe('decideFreePlayLevelProgression', () => {
    it('promotes when matchPct >= promotePct', () => {
        const d = decideFreePlayLevelProgression({
            level: 3,
            failStreak: 2,
            matchPct: 80,
            promotePct: 80,
            demotePct: 80,
            failsToDemote: 3,
            demoteRequiresConsecutive: true,
        });
        expect(d).toMatchObject({ action: 'promote', level: 4, failStreak: 0 });
    });

    it('demotes after failsToDemote consecutive fails', () => {
        const d = decideFreePlayLevelProgression({
            level: 3,
            failStreak: 2,
            matchPct: 50,
            promotePct: 80,
            demotePct: 80,
            failsToDemote: 3,
            demoteRequiresConsecutive: true,
        });
        expect(d).toMatchObject({ action: 'demote', level: 2, failStreak: 0 });
    });

    it('holds and increments streak below threshold', () => {
        const d = decideFreePlayLevelProgression({
            level: 3,
            failStreak: 0,
            matchPct: 70,
            promotePct: 80,
            demotePct: 80,
            failsToDemote: 3,
            demoteRequiresConsecutive: true,
        });
        expect(d).toMatchObject({ action: 'hold', level: 3, failStreak: 1 });
    });

    it('stays at minLevel when demote would go below', () => {
        const d = decideFreePlayLevelProgression({
            level: 1,
            failStreak: 2,
            matchPct: 40,
            promotePct: 80,
            demotePct: 80,
            failsToDemote: 3,
            demoteRequiresConsecutive: true,
        });
        expect(d).toMatchObject({ action: 'hold', level: 1, failStreak: 0 });
    });

    it('supports custom promotePct and failsToDemote', () => {
        const hold = decideFreePlayLevelProgression({
            level: 5,
            failStreak: 0,
            matchPct: 85,
            promotePct: 90,
            demotePct: 75,
            failsToDemote: 2,
            demoteRequiresConsecutive: true,
        });
        expect(hold).toMatchObject({ action: 'hold', level: 5, failStreak: 1 });

        const demote = decideFreePlayLevelProgression({
            level: 5,
            failStreak: 1,
            matchPct: 85,
            promotePct: 90,
            demotePct: 75,
            failsToDemote: 2,
            demoteRequiresConsecutive: true,
        });
        expect(demote).toMatchObject({ action: 'demote', level: 4, failStreak: 0 });
    });

    it('promotes unbounded (no max level)', () => {
        const d = decideFreePlayLevelProgression({
            level: 20,
            failStreak: 0,
            matchPct: 95,
            promotePct: 80,
            demotePct: 80,
            failsToDemote: 3,
            demoteRequiresConsecutive: true,
        });
        expect(d).toMatchObject({ action: 'promote', level: 21, failStreak: 0 });
    });

    it('uses the separate demote threshold and resets a sequential count on a safe block', () => {
        const d = decideFreePlayLevelProgression({
            level: 3,
            failStreak: 1,
            matchPct: 75,
            promotePct: 90,
            demotePct: 70,
            failsToDemote: 2,
            demoteRequiresConsecutive: true,
        });
        expect(d).toMatchObject({ action: 'hold', level: 3, failStreak: 0 });
    });

    it('accumulates non-sequential blocks below the demote threshold', () => {
        const safeBlock = decideFreePlayLevelProgression({
            level: 3,
            failStreak: 1,
            matchPct: 75,
            promotePct: 90,
            demotePct: 70,
            failsToDemote: 2,
            demoteRequiresConsecutive: false,
        });
        expect(safeBlock).toMatchObject({ action: 'hold', level: 3, failStreak: 1 });

        const d = decideFreePlayLevelProgression({
            level: 3,
            failStreak: safeBlock.failStreak,
            matchPct: 60,
            promotePct: 90,
            demotePct: 70,
            failsToDemote: 2,
            demoteRequiresConsecutive: false,
        });
        expect(d).toMatchObject({ action: 'demote', level: 2, failStreak: 0 });
    });
});
