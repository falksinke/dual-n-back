import type { GameResult } from './GameResult';
import {
    appendStatisticsRound,
    type StatisticsInterferenceLevel,
    type StatisticsRound,
} from './statistics';
import type { ModalityId } from './modalities';
import type { GameStore, PlayMode } from '../store/gameStore';
import { useGameStore } from '../store/gameStore';
import { noteLocalProgressChanged } from '../sync/noteLocal';

export interface StatisticsRoundContext {
    startedAt: Date;
    playMode: PlayMode;
    mode: StatisticsRound['mode'];
    modalities: ModalityId[];
    interferenceLevel: StatisticsInterferenceLevel;
    nBack: number;
}

function contextFromState(state: GameStore, startedAt: Date): StatisticsRoundContext {
    return {
        startedAt,
        playMode: state.settings.playMode,
        mode: state.settings.mode,
        modalities: [...state.activeModalities],
        interferenceLevel: state.settings.interferenceChance,
        nBack: state.settings.level,
    };
}

export function statisticsRoundFromResult(
    result: GameResult,
    context: StatisticsRoundContext,
    blockRole: string | null,
    completedAt: Date = new Date()
): StatisticsRound {
    const completedAtIso = completedAt.toISOString();

    const modalityScores = Object.fromEntries(
        result.modalities.map((modality) => [modality, result.getMatchPercentage(modality)])
    );

    return {
        id: `${completedAtIso}-${context.mode}-${context.nBack}`,
        completedAt: completedAtIso,
        durationMs: Math.max(0, completedAt.getTime() - context.startedAt.getTime()),
        playMode: context.playMode,
        blockRole,
        mode: context.mode,
        modalities: context.modalities,
        interferenceLevel: context.interferenceLevel,
        nBack: context.nBack,
        scorePct: result.generalMatchPercentage,
        modalityScores,
        variableN: result.nBackDistribution,
    };
}

export function bindStatisticsTracking(): () => void {
    const initial = useGameStore.getState();
    let previousResultCount = initial.results.all.length;
    let previousGameActive = initial.game != null;
    let activeRound = previousGameActive ? contextFromState(initial, new Date()) : null;

    return useGameStore.subscribe((state) => {
        const gameActive = state.game != null;
        if (!previousGameActive && gameActive) {
            activeRound = contextFromState(state, new Date());
        }

        const resultCount = state.results.all.length;
        if (resultCount > previousResultCount && activeRound != null) {
            const completedAt = new Date();
            for (const result of state.results.all.slice(previousResultCount)) {
                appendStatisticsRound(
                    statisticsRoundFromResult(
                        result,
                        activeRound,
                        state.lastBlockRole,
                        completedAt
                    )
                );
            }
            noteLocalProgressChanged();
            activeRound = null;
        } else if (previousGameActive && !gameActive) {
            activeRound = null;
        }

        previousResultCount = resultCount;
        previousGameActive = gameActive;
    });
}
