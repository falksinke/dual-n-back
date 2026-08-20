import type { GameResult } from './GameResult';
import { appendStatisticsRound, type StatisticsRound } from './statistics';
import type { PlayMode } from '../store/gameStore';
import { useGameStore } from '../store/gameStore';

export function statisticsRoundFromResult(
    result: GameResult,
    playMode: PlayMode,
    blockRole: string | null
): StatisticsRound | null {
    const log = result.debugLog;
    if (log == null) return null;

    const modalityScores = Object.fromEntries(
        result.modalities.map((modality) => [modality, result.getMatchPercentage(modality)])
    );

    return {
        id: `${log.completedAt}-${log.config.mode}-${log.config.level}`,
        completedAt: log.completedAt,
        durationMs: log.durationMs,
        playMode,
        blockRole,
        mode: log.config.mode,
        nBack: log.config.level,
        scorePct: result.generalMatchPercentage,
        modalityScores,
        variableN: result.nBackDistribution,
    };
}

export function bindStatisticsTracking(): () => void {
    let previousResultCount = useGameStore.getState().results.all.length;

    return useGameStore.subscribe((state) => {
        const resultCount = state.results.all.length;
        if (resultCount <= previousResultCount) {
            previousResultCount = resultCount;
            return;
        }

        for (const result of state.results.all.slice(previousResultCount)) {
            const round = statisticsRoundFromResult(
                result,
                state.settings.playMode,
                state.lastBlockRole
            );
            if (round != null) appendStatisticsRound(round);
        }
        previousResultCount = resultCount;
    });
}
