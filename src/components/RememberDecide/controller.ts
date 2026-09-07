import { scoreRound } from '../../model/rememberDecide';
import type {
    DecisionAnswer,
    DecisionResponse,
    MemoryLocation,
    RememberDecideConfig,
    RememberDecideRound,
    RememberDecideScore,
} from '../../model/rememberDecide';

export const LOCATION_EXPOSURE_MS = 1000;
export const BLANK_TRANSITION_MS = 250;

export type TimedPhase = 'location' | 'location-blank' | 'decision' | 'decision-blank';
export type ActivePhase = TimedPhase | 'recall';
export type RememberDecidePhase = 'setup' | ActivePhase | 'interrupted' | 'result';

export interface PhaseRun {
    readonly generation: number;
    readonly phase: TimedPhase;
    readonly itemIndex: number;
    readonly deadline: number;
}

export interface RememberDecideState {
    readonly phase: RememberDecidePhase;
    readonly config: RememberDecideConfig;
    readonly round: RememberDecideRound | null;
    readonly itemIndex: number;
    readonly decisions: readonly DecisionResponse[];
    readonly recalled: readonly MemoryLocation[];
    readonly score: RememberDecideScore | null;
    readonly generation: number;
    readonly phaseRun: PhaseRun | null;
    readonly status: string;
    readonly error: string | null;
}

export type RememberDecideAction =
    | { type: 'configure'; config: RememberDecideConfig }
    | { type: 'start'; round: RememberDecideRound }
    | { type: 'setup'; error?: string }
    | { type: 'mount-phase'; generation: number; phase: TimedPhase; itemIndex: number; now: number }
    | { type: 'phase-elapsed'; generation: number; phase: TimedPhase; itemIndex: number; now: number }
    | { type: 'answer'; generation: number; itemIndex: number; answer: DecisionAnswer; now: number }
    | { type: 'remember'; generation: number; location: MemoryLocation }
    | { type: 'undo' | 'clear' | 'submit' | 'interrupt'; generation: number };

export const DEFAULT_REMEMBER_DECIDE_CONFIG: RememberDecideConfig = {
    sequenceLength: 3,
    symmetryDifficulty: 'more',
    judgementDeadlineMs: 5000,
};

export function initialState(
    config: RememberDecideConfig = DEFAULT_REMEMBER_DECIDE_CONFIG
): RememberDecideState {
    return {
        phase: 'setup',
        config,
        round: null,
        itemIndex: 0,
        decisions: [],
        recalled: [],
        score: null,
        generation: 0,
        phaseRun: null,
        status: 'Choose settings, then start a round.',
        error: null,
    };
}

function isActivePhase(phase: RememberDecidePhase): phase is ActivePhase {
    return phase === 'location'
        || phase === 'location-blank'
        || phase === 'decision'
        || phase === 'decision-blank'
        || phase === 'recall';
}

function timedDuration(state: RememberDecideState, phase: TimedPhase): number {
    if (phase === 'location') return LOCATION_EXPOSURE_MS;
    if (phase === 'decision') return state.config.judgementDeadlineMs;
    return BLANK_TRANSITION_MS;
}

function matchesPhase(
    state: RememberDecideState,
    action: { generation: number; phase: TimedPhase; itemIndex: number }
): boolean {
    return state.generation === action.generation
        && state.phase === action.phase
        && state.itemIndex === action.itemIndex;
}

function enterPhase(
    state: RememberDecideState,
    phase: ActivePhase,
    itemIndex: number,
    status: string
): RememberDecideState {
    return { ...state, phase, itemIndex, phaseRun: null, status };
}

function settleDecision(
    state: RememberDecideState,
    answer: DecisionAnswer | null,
    timedOut: boolean
): RememberDecideState {
    const decisions = [
        ...state.decisions,
        { itemIndex: state.itemIndex, answer, timedOut },
    ];
    const status = timedOut
        ? `Time expired for pattern ${state.itemIndex + 1}.`
        : `Answer recorded for pattern ${state.itemIndex + 1}.`;
    return {
        ...state,
        phase: 'decision-blank',
        decisions,
        phaseRun: null,
        status,
    };
}

export function rememberDecideReducer(
    state: RememberDecideState,
    action: RememberDecideAction
): RememberDecideState {
    switch (action.type) {
        case 'configure':
            return state.phase === 'setup'
                ? { ...state, config: action.config, error: null }
                : state;
        case 'setup':
            return {
                ...initialState(state.config),
                generation: state.generation + 1,
                error: action.error ?? null,
            };
        case 'start':
            return {
                ...initialState(action.round.config),
                phase: 'location',
                round: action.round,
                generation: state.generation + 1,
                status: `Location 1 of ${action.round.items.length}.`,
            };
        case 'mount-phase': {
            if (!matchesPhase(state, action) || state.phaseRun) return state;
            return {
                ...state,
                phaseRun: {
                    generation: action.generation,
                    phase: action.phase,
                    itemIndex: action.itemIndex,
                    deadline: action.now + timedDuration(state, action.phase),
                },
            };
        }
        case 'phase-elapsed': {
            if (!matchesPhase(state, action) || !state.phaseRun) return state;
            if (action.now < state.phaseRun.deadline) return state;
            if (action.phase === 'location') {
                return enterPhase(
                    state,
                    'location-blank',
                    state.itemIndex,
                    `Location ${state.itemIndex + 1} hidden. Get ready to decide.`
                );
            }
            if (action.phase === 'location-blank') {
                return enterPhase(
                    state,
                    'decision',
                    state.itemIndex,
                    `Pattern ${state.itemIndex + 1} of ${state.round?.items.length ?? 0}.`
                );
            }
            if (action.phase === 'decision') return settleDecision(state, null, true);

            const nextItem = state.itemIndex + 1;
            if (state.round && nextItem < state.round.items.length) {
                return enterPhase(
                    state,
                    'location',
                    nextItem,
                    `Location ${nextItem + 1} of ${state.round.items.length}.`
                );
            }
            return enterPhase(
                state,
                'recall',
                state.itemIndex,
                `Recall 0 of ${state.round?.items.length ?? 0}.`
            );
        }
        case 'answer': {
            if (
                state.phase !== 'decision'
                || state.generation !== action.generation
                || state.itemIndex !== action.itemIndex
                || !state.phaseRun
            ) return state;
            return action.now >= state.phaseRun.deadline
                ? settleDecision(state, null, true)
                : settleDecision(state, action.answer, false);
        }
        case 'remember': {
            if (
                state.phase !== 'recall'
                || state.generation !== action.generation
                || !state.round
                || state.recalled.length >= state.round.items.length
            ) return state;
            const recalled = [...state.recalled, action.location];
            return {
                ...state,
                recalled,
                status: `Recall ${recalled.length} of ${state.round.items.length}.`,
            };
        }
        case 'undo': {
            if (
                state.phase !== 'recall'
                || state.generation !== action.generation
                || !state.round
                || state.recalled.length === 0
            ) return state;
            const recalled = state.recalled.slice(0, -1);
            return {
                ...state,
                recalled,
                status: `Recall ${recalled.length} of ${state.round.items.length}.`,
            };
        }
        case 'clear':
            return state.phase === 'recall'
                && state.generation === action.generation
                && state.round
                && state.recalled.length > 0
                ? { ...state, recalled: [], status: `Recall 0 of ${state.round.items.length}.` }
                : state;
        case 'submit': {
            if (
                state.phase !== 'recall'
                || state.generation !== action.generation
                || !state.round
                || state.recalled.length !== state.round.items.length
            ) return state;
            return {
                ...state,
                phase: 'result',
                score: scoreRound(state.round, state.recalled, state.decisions),
                generation: state.generation + 1,
                phaseRun: null,
                status: 'Results available.',
            };
        }
        case 'interrupt':
            return state.generation === action.generation && isActivePhase(state.phase)
                ? {
                    ...initialState(state.config),
                    phase: 'interrupted',
                    generation: state.generation + 1,
                    status: 'Round interrupted. This attempt was discarded.',
                }
                : state;
    }
}
