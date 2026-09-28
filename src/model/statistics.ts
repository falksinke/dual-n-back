import type { ModalityId, ModeId } from './modalities';
import type { NBackDistributionEntry } from './GameResult';
import type { StorageLike } from './uiPreferences';
import {
    isStatisticsInterferenceLevel,
    isStatisticsModalityCombination,
    statisticsCategoryId,
    type StatisticsCategoryFilter,
    type StatisticsInterferenceLevel,
} from './statisticsCategories';

export {
    buildStatisticsCategories,
    statisticsCategoryId,
    statisticsCategoryLabel,
} from './statisticsCategories';
export type {
    StatisticsCategory,
    StatisticsCategoryFilter,
    StatisticsInterferenceLevel,
} from './statisticsCategories';

export const STATISTICS_STORAGE_KEY = 'nback-statistics';
export const STATISTICS_SCHEMA_VERSION = 2 as const;
export const MAX_STATISTICS_ROUNDS = 2000;
const TRAINING_DAY_ROLLOVER_HOUR = 4;

export interface StatisticsRound {
    id: string;
    completedAt: string;
    durationMs: number;
    playMode: 'free' | 'adaptive' | 'cyclic';
    blockRole: string | null;
    mode: ModeId;
    modalities: ModalityId[];
    interferenceLevel: StatisticsInterferenceLevel;
    nBack: number;
    scorePct: number;
    modalityScores: Partial<Record<ModalityId, number>>;
    variableN: NBackDistributionEntry[] | null;
}

export interface StatisticsHistory {
    version: typeof STATISTICS_SCHEMA_VERSION;
    rounds: StatisticsRound[];
}

export interface StatisticsActivity {
    rounds: number;
    durationMs: number;
}

export interface StatisticsDailyPoint {
    dayKey: string;
    averageN: number;
    maximumN: number;
}

export interface StatisticsSummary {
    totalRounds: number;
    averageScore: number;
    averageNLast20: number;
    today: StatisticsActivity;
    last24Hours: StatisticsActivity;
    recent: StatisticsRound[];
    modalityAverages: Partial<Record<ModalityId, number>>;
    dailyTrend: StatisticsDailyPoint[];
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
    if (storage != null) return storage;
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage;
}

function roundToOne(value: number): number {
    return Math.round(value * 10) / 10;
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    return roundToOne(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function trainingDayKey(date: Date): string {
    const day = new Date(date.getTime());
    if (day.getHours() < TRAINING_DAY_ROLLOVER_HOUR) {
        day.setDate(day.getDate() - 1);
    }
    return [
        day.getFullYear(),
        String(day.getMonth() + 1).padStart(2, '0'),
        String(day.getDate()).padStart(2, '0'),
    ].join('-');
}

function isModeId(value: unknown): value is ModeId {
    return value === 'single' || value === 'dual' || value === 'triple' || value === 'quad';
}

function isNBackDistribution(value: unknown): value is NBackDistributionEntry[] {
    return (
        Array.isArray(value) &&
        value.every((entry) => {
            if (entry == null || typeof entry !== 'object') return false;
            const candidate = entry as Partial<NBackDistributionEntry>;
            return Number.isFinite(candidate.n) && Number.isFinite(candidate.trials);
        })
    );
}

function isStatisticsRound(value: unknown): value is StatisticsRound {
    if (value == null || typeof value !== 'object') return false;
    const round = value as Partial<StatisticsRound>;
    return (
        typeof round.id === 'string' &&
        typeof round.completedAt === 'string' &&
        Number.isFinite(Date.parse(round.completedAt)) &&
        typeof round.durationMs === 'number' &&
        Number.isFinite(round.durationMs) &&
        (round.playMode === 'free' ||
            round.playMode === 'adaptive' ||
            round.playMode === 'cyclic') &&
        (round.blockRole === null || typeof round.blockRole === 'string') &&
        isModeId(round.mode) &&
        isStatisticsModalityCombination(round.modalities) &&
        isStatisticsInterferenceLevel(round.interferenceLevel) &&
        typeof round.nBack === 'number' &&
        Number.isFinite(round.nBack) &&
        typeof round.scorePct === 'number' &&
        Number.isFinite(round.scorePct) &&
        round.modalityScores != null &&
        typeof round.modalityScores === 'object' &&
        (round.variableN === null || isNBackDistribution(round.variableN))
    );
}

export function createEmptyStatisticsHistory(): StatisticsHistory {
    return { version: STATISTICS_SCHEMA_VERSION, rounds: [] };
}

export function parseStatisticsHistory(raw: string): StatisticsHistory {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed == null || typeof parsed !== 'object') {
            return createEmptyStatisticsHistory();
        }
        const candidate = parsed as { version?: unknown; rounds?: unknown };
        if (candidate.version !== STATISTICS_SCHEMA_VERSION || !Array.isArray(candidate.rounds)) {
            return createEmptyStatisticsHistory();
        }
        return {
            version: STATISTICS_SCHEMA_VERSION,
            rounds: candidate.rounds.filter(isStatisticsRound).slice(-MAX_STATISTICS_ROUNDS),
        };
    } catch {
        return createEmptyStatisticsHistory();
    }
}

export function loadStatisticsHistory(storage?: StorageLike): StatisticsHistory {
    const resolved = resolveStorage(storage);
    if (resolved == null) return createEmptyStatisticsHistory();
    const raw = resolved.getItem(STATISTICS_STORAGE_KEY);
    return raw ? parseStatisticsHistory(raw) : createEmptyStatisticsHistory();
}

export function appendStatisticsRound(
    round: StatisticsRound,
    storage?: StorageLike
): StatisticsHistory {
    const resolved = resolveStorage(storage);
    const history = loadStatisticsHistory(resolved ?? undefined);
    const next = {
        version: STATISTICS_SCHEMA_VERSION,
        rounds: [...history.rounds, round].slice(-MAX_STATISTICS_ROUNDS),
    } satisfies StatisticsHistory;
    if (resolved != null) {
        try {
            resolved.setItem(STATISTICS_STORAGE_KEY, JSON.stringify(next));
        } catch {
            // Storage can be unavailable in browser privacy modes.
        }
    }
    return next;
}

function activity(rounds: StatisticsRound[]): StatisticsActivity {
    return {
        rounds: rounds.length,
        durationMs: rounds.reduce((sum, round) => sum + round.durationMs, 0),
    };
}

function modalityAverages(rounds: StatisticsRound[]): Partial<Record<ModalityId, number>> {
    const recent = rounds.slice(-50);
    const values: Partial<Record<ModalityId, number[]>> = {};
    for (const round of recent) {
        for (const [modality, score] of Object.entries(round.modalityScores)) {
            if (!Number.isFinite(score)) continue;
            const key = modality as ModalityId;
            (values[key] ??= []).push(score);
        }
    }
    return Object.fromEntries(
        Object.entries(values).map(([modality, scores]) => [modality, average(scores)])
    );
}

function dailyTrend(rounds: StatisticsRound[]): StatisticsDailyPoint[] {
    const byDay = new Map<string, StatisticsRound[]>();
    for (const round of rounds) {
        const dayKey = trainingDayKey(new Date(round.completedAt));
        const dayRounds = byDay.get(dayKey) ?? [];
        dayRounds.push(round);
        byDay.set(dayKey, dayRounds);
    }
    return [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dayKey, dayRounds]) => ({
            dayKey,
            averageN: average(dayRounds.map((round) => round.nBack)),
            maximumN: Math.max(...dayRounds.map((round) => round.nBack)),
        }));
}

export function buildStatisticsSummary(
    rounds: StatisticsRound[],
    category: StatisticsCategoryFilter,
    now: Date = new Date()
): StatisticsSummary {
    const filtered =
        category === 'all'
            ? rounds
            : rounds.filter((round) => statisticsCategoryId(round) === category);
    const currentDay = trainingDayKey(now);
    const last24Cutoff = now.getTime() - 24 * 60 * 60 * 1000;
    const todayRounds = filtered.filter(
        (round) => trainingDayKey(new Date(round.completedAt)) === currentDay
    );
    const last24Rounds = filtered.filter(
        (round) => new Date(round.completedAt).getTime() >= last24Cutoff
    );
    const last20 = filtered.slice(-20);

    return {
        totalRounds: filtered.length,
        averageScore: average(filtered.map((round) => round.scorePct)),
        averageNLast20: average(last20.map((round) => round.nBack)),
        today: activity(todayRounds),
        last24Hours: activity(last24Rounds),
        recent: [...last20].reverse(),
        modalityAverages: modalityAverages(filtered),
        dailyTrend: dailyTrend(filtered),
    };
}
