import { describe, expect, it } from 'vitest';
import {
    clampCompletedToGoal,
    createDefaultDailyProgress,
    ensureCurrentDay,
    parseDailyProgress,
    recordDailyRound,
    sessionEndIndices,
    splitRoundsIntoSessions,
    trainingDayKey,
    type DailyProgressV1,
} from './dailyProgress';

function memoryStorage(initial: Record<string, string> = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
        _map: map,
    };
}

describe('splitRoundsIntoSessions', () => {
    it('splits 20/4 evenly', () => {
        expect(splitRoundsIntoSessions(20, 4)).toEqual([5, 5, 5, 5]);
    });

    it('puts remainder on earlier groups (22/4)', () => {
        expect(splitRoundsIntoSessions(22, 4)).toEqual([6, 6, 5, 5]);
    });

    it('clamps sessions to rounds when rounds < sessions', () => {
        expect(splitRoundsIntoSessions(3, 4)).toEqual([1, 1, 1]);
    });

    it('returns empty for zero rounds', () => {
        expect(splitRoundsIntoSessions(0, 4)).toEqual([]);
    });
});

describe('trainingDayKey', () => {
    it('uses previous calendar day before 04:00', () => {
        // 2026-08-06 03:59 local
        const before = new Date(2026, 7, 6, 3, 59, 0);
        expect(trainingDayKey(before)).toBe('2026-08-05');
    });

    it('uses current calendar day at 04:00', () => {
        const at = new Date(2026, 7, 6, 4, 0, 0);
        expect(trainingDayKey(at)).toBe('2026-08-06');
    });
});

describe('sessionEndIndices', () => {
    it('marks last index of each group', () => {
        expect(sessionEndIndices([5, 5, 5, 5])).toEqual([4, 9, 14, 19]);
    });
});

describe('parseDailyProgress', () => {
    it('returns defaults for corrupt JSON', () => {
        const now = new Date(2026, 7, 6, 12, 0, 0);
        const parsed = parseDailyProgress('{not json', now);
        expect(parsed).toEqual(createDefaultDailyProgress(now));
    });
});

describe('recordDailyRound / ensureCurrentDay / clamp', () => {
    it('increments three times same day', () => {
        const storage = memoryStorage();
        const now = new Date(2026, 7, 6, 12, 0, 0);
        expect(recordDailyRound(20, storage, now).completedCount).toBe(1);
        expect(recordDailyRound(20, storage, now).completedCount).toBe(2);
        expect(recordDailyRound(20, storage, now).completedCount).toBe(3);
    });

    it('resets on new dayKey then records 1', () => {
        const storage = memoryStorage();
        const day1 = new Date(2026, 7, 6, 12, 0, 0);
        recordDailyRound(20, storage, day1);
        recordDailyRound(20, storage, day1);
        const day2 = new Date(2026, 7, 7, 12, 0, 0);
        expect(ensureCurrentDay(storage, day2).completedCount).toBe(0);
        expect(recordDailyRound(20, storage, day2).completedCount).toBe(1);
    });

    it('no-ops at cap', () => {
        const storage = memoryStorage();
        const now = new Date(2026, 7, 6, 12, 0, 0);
        const data: DailyProgressV1 = {
            version: 1,
            dayKey: trainingDayKey(now),
            completedCount: 20,
        };
        storage.setItem('nback-daily-progress', JSON.stringify(data));
        expect(recordDailyRound(20, storage, now).completedCount).toBe(20);
    });

    it('clamps when goal shrinks', () => {
        const storage = memoryStorage();
        const now = new Date(2026, 7, 6, 12, 0, 0);
        storage.setItem(
            'nback-daily-progress',
            JSON.stringify({
                version: 1,
                dayKey: trainingDayKey(now),
                completedCount: 15,
            })
        );
        expect(clampCompletedToGoal(10, storage, now).completedCount).toBe(10);
    });
});
