import { describe, expect, it } from 'vitest';
import {
    STATISTICS_STORAGE_KEY,
    appendStatisticsRound,
    buildStatisticsSummary,
    createEmptyStatisticsHistory,
    loadStatisticsHistory,
    parseStatisticsHistory,
    type StatisticsRound,
} from './statistics';

function memoryStorage(initial: Record<string, string> = {}) {
    const map = new Map(Object.entries(initial));
    return {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
        map,
    };
}

function round(overrides: Partial<StatisticsRound> = {}): StatisticsRound {
    return {
        id: '2026-08-20T10:00:00.000Z-dual-2',
        completedAt: '2026-08-20T10:00:00.000Z',
        durationMs: 60_000,
        playMode: 'free',
        blockRole: 'free',
        mode: 'dual',
        nBack: 2,
        scorePct: 75,
        modalityScores: { position: 80, audio: 70 },
        variableN: null,
        ...overrides,
    };
}

describe('statistics persistence', () => {
    it('returns an empty versioned history for corrupt storage', () => {
        expect(parseStatisticsHistory('{broken')).toEqual(createEmptyStatisticsHistory());
        expect(parseStatisticsHistory('null')).toEqual(createEmptyStatisticsHistory());
        expect(parseStatisticsHistory('{"version":2,"rounds":[]}')).toEqual(
            createEmptyStatisticsHistory()
        );
    });

    it('keeps valid rounds when stored history contains malformed entries', () => {
        expect(
            parseStatisticsHistory(
                JSON.stringify({
                    version: 1,
                    rounds: [
                        round(),
                        { id: 'broken' },
                        round({ id: 'bad-variable-n', variableN: [null] as never }),
                    ],
                })
            ).rounds
        ).toEqual([round()]);
    });

    it('persists completed rounds and loads them again', () => {
        const storage = memoryStorage();
        appendStatisticsRound(round(), storage);

        expect(loadStatisticsHistory(storage).rounds).toEqual([round()]);
        expect(storage.map.has(STATISTICS_STORAGE_KEY)).toBe(true);
    });

    it('returns the new history when storage rejects a write', () => {
        const storage = {
            getItem: () => null,
            setItem: () => {
                throw new Error('quota exceeded');
            },
        };

        expect(() => appendStatisticsRound(round(), storage)).not.toThrow();
        expect(appendStatisticsRound(round(), storage).rounds).toEqual([round()]);
    });

    it('keeps only the newest 2000 rounds', () => {
        const seededRounds = Array.from({ length: 2000 }, (_, index) =>
            round({ id: `round-${index}` })
        );
        const storage = memoryStorage({
            [STATISTICS_STORAGE_KEY]: JSON.stringify({ version: 1, rounds: seededRounds }),
        });
        appendStatisticsRound(round({ id: 'round-2000' }), storage);

        const rounds = loadStatisticsHistory(storage).rounds;
        expect(rounds).toHaveLength(2000);
        expect(rounds[0]?.id).toBe('round-1');
        expect(rounds.at(-1)?.id).toBe('round-2000');
    });
});

describe('buildStatisticsSummary', () => {
    const rounds = [
        round({
            id: 'a',
            completedAt: '2026-08-19T10:00:00.000+02:00',
            nBack: 2,
            scorePct: 60,
            modalityScores: { position: 70, audio: 50 },
        }),
        round({
            id: 'b',
            completedAt: '2026-08-20T02:30:00.000+02:00',
            nBack: 3,
            scorePct: 80,
            modalityScores: { position: 90, audio: 70 },
        }),
        round({
            id: 'c',
            completedAt: '2026-08-20T11:00:00.000+02:00',
            durationMs: 90_000,
            mode: 'triple',
            nBack: 4,
            scorePct: 90,
            modalityScores: { position: 100, color: 80, audio: 90 },
        }),
    ];

    it('builds recent, activity, modality, and trend summaries', () => {
        const now = new Date('2026-08-20T12:00:00.000+02:00');
        const summary = buildStatisticsSummary(rounds, 'all', now);

        expect(summary.totalRounds).toBe(3);
        expect(summary.averageScore).toBeCloseTo(76.7, 1);
        expect(summary.averageNLast20).toBe(3);
        expect(summary.today).toEqual({ rounds: 1, durationMs: 90_000 });
        expect(summary.last24Hours).toEqual({ rounds: 2, durationMs: 150_000 });
        expect(summary.recent.map((item) => item.id)).toEqual(['c', 'b', 'a']);
        expect(summary.modalityAverages).toEqual({
            position: 86.7,
            color: 80,
            audio: 70,
        });
        expect(summary.dailyTrend).toEqual([
            { dayKey: '2026-08-19', averageN: 2.5, maximumN: 3 },
            { dayKey: '2026-08-20', averageN: 4, maximumN: 4 },
        ]);
    });

    it('filters every summary by game mode', () => {
        const summary = buildStatisticsSummary(
            rounds,
            'dual',
            new Date('2026-08-20T12:00:00.000+02:00')
        );

        expect(summary.totalRounds).toBe(2);
        expect(summary.recent.map((item) => item.id)).toEqual(['b', 'a']);
        expect(summary.modalityAverages).toEqual({ position: 80, audio: 60 });
    });
});
