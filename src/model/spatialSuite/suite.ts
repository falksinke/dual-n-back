import { levelOf, scoreBlock, stepDifficulty } from './engine';
import { generateDrift } from './games/drift';
import { generatePattern, type PatternVariant } from './games/pattern';
import { generateRelay } from './games/relay';
import { generateShift, type ShiftRule } from './games/shift';
import { generateWayfinder } from './games/wayfinder';
import type { SuiteState } from './storage';
import type { BlockLog, BlockPlan, GameId, Rng, TrialLog, TrialResponse } from './types';

export interface BlockRequest {
    game: GameId;
    /** Active Shift deck; ignored by the other games. */
    deck?: ShiftRule[];
    /** Runs the untrained Shift rule without touching difficulty. */
    holdout?: boolean;
}

/** Pattern alternates variants by playing whichever has fewer blocks logged. */
export function nextPatternVariant(state: SuiteState): PatternVariant {
    const shapes = state.blocks.filter((b) => b.track === 'pattern-shape').length;
    const relations = state.blocks.filter((b) => b.track === 'pattern-relation').length;
    return relations < shapes ? 'relation' : 'shape';
}

export function createBlock(state: SuiteState, request: BlockRequest, rng: Rng): BlockPlan<unknown> {
    switch (request.game) {
        case 'drift': return generateDrift(state.tracks.drift, rng);
        case 'wayfinder': return generateWayfinder(state.tracks.wayfinder, rng);
        case 'pattern': {
            const variant = nextPatternVariant(state);
            return generatePattern(variant, state.tracks[variant === 'shape' ? 'pattern-shape' : 'pattern-relation'], rng);
        }
        case 'shift':
            return request.holdout
                ? generateShift(state.tracks.shift, [state.holdoutRule], rng, true)
                : generateShift(state.tracks.shift, request.deck ?? ['screen', 'mirror'], rng);
        case 'relay': return generateRelay(state.tracks.relay, rng);
    }
}

export interface BlockOutcome {
    state: SuiteState;
    log: BlockLog;
}

export function completeBlock(
    state: SuiteState,
    plan: BlockPlan<unknown>,
    responses: TrialResponse[],
    options: { now?: Date; trackedCorrect?: number; trackedTotal?: number; id?: string } = {}
): BlockOutcome {
    const now = options.now ?? new Date();
    const id = options.id ?? `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const score = scoreBlock(plan.trials, responses);
    const before = plan.difficulty;
    const step = plan.holdout
        ? { difficulty: state.tracks[plan.track], change: { direction: 'hold' as const, dial: null, from: null, to: null } }
        : stepDifficulty(plan.track, state.tracks[plan.track], score.accuracy);

    const log: BlockLog = {
        id,
        at: now.toISOString(),
        game: plan.game,
        track: plan.track,
        rules: plan.rules,
        n: before.n,
        lureRate: before.lureRate,
        isiMs: before.isiMs,
        extra: before.extra,
        level: levelOf(step.difficulty),
        change: step.change,
        holdout: plan.holdout,
        ...score,
        ...(options.trackedTotal !== undefined ? { trackedCorrect: options.trackedCorrect ?? 0, trackedTotal: options.trackedTotal } : {}),
    };

    const trialLogs: TrialLog[] = plan.trials.map((trial, i) => {
        const response = responses[i] ?? { responded: false, rtMs: null };
        return {
            blockId: id,
            timestamp: new Date(now.getTime() - (plan.onsets[plan.onsets.length - 1] - plan.onsets[i])).toISOString(),
            game: plan.game,
            rule: trial.rule,
            n: before.n,
            stimulus: trial.stimulus,
            isTarget: trial.isTarget,
            isLure: trial.isLure,
            lureType: trial.lureType,
            response: response.responded,
            rtMs: response.rtMs,
            correct: response.responded === trial.isTarget,
        };
    });

    return {
        log,
        state: {
            ...state,
            tracks: { ...state.tracks, [plan.track]: step.difficulty },
            blocks: [...state.blocks, log],
            trials: [...state.trials, ...trialLogs],
            lastHoldoutAt: plan.holdout ? log.at : state.lastHoldoutAt,
        },
    };
}
