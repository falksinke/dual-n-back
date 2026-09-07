import type {
    MemoryLocation,
    RememberDecideConfig,
    RememberDecideRound,
    RememberDecideScore,
    SymmetryPattern,
} from '../../model/rememberDecide';
import type { RememberDecideState, TimedPhase } from './controller';

interface TimedIdentity {
    readonly generation: number;
    readonly itemIndex: number;
}

export type RememberDecideProjection =
    | { phase: 'setup'; config: RememberDecideConfig; generation: number; error: string | null; status: string }
    | ({ phase: 'location'; location: MemoryLocation; itemCount: number; status: string } & TimedIdentity)
    | ({ phase: 'location-blank' | 'decision-blank'; itemCount: number; status: string } & TimedIdentity)
    | ({ phase: 'decision'; pattern: SymmetryPattern; itemCount: number; deadlineMs: number; status: string } & TimedIdentity)
    | { phase: 'recall'; generation: number; sequenceLength: number; recalled: readonly MemoryLocation[]; status: string }
    | { phase: 'interrupted'; generation: number; status: string }
    | { phase: 'result'; generation: number; round: RememberDecideRound; score: RememberDecideScore; status: string };

function timedIdentity(state: RememberDecideState): TimedIdentity {
    return { generation: state.generation, itemIndex: state.itemIndex };
}

export function phaseIdentity(state: RememberDecideState): string {
    return `${state.generation}:${state.phase}:${state.itemIndex}`;
}

export function projectState(state: RememberDecideState): RememberDecideProjection {
    if (state.phase === 'setup' || !state.round && state.phase !== 'interrupted') {
        return { phase: 'setup', config: state.config, generation: state.generation, error: state.error, status: state.status };
    }
    if (state.phase === 'interrupted') return { phase: 'interrupted', generation: state.generation, status: state.status };
    if (!state.round) throw new Error('An active Remember & Decide phase requires a round.');

    if (state.phase === 'location') {
        return {
            phase: 'location',
            ...timedIdentity(state),
            location: state.round.items[state.itemIndex].location,
            itemCount: state.round.items.length,
            status: state.status,
        };
    }
    if (state.phase === 'location-blank' || state.phase === 'decision-blank') {
        return {
            phase: state.phase,
            ...timedIdentity(state),
            itemCount: state.round.items.length,
            status: state.status,
        };
    }
    if (state.phase === 'decision') {
        return {
            phase: 'decision',
            ...timedIdentity(state),
            pattern: state.round.items[state.itemIndex].pattern,
            itemCount: state.round.items.length,
            deadlineMs: state.config.judgementDeadlineMs,
            status: state.status,
        };
    }
    if (state.phase === 'recall') {
        return {
            phase: 'recall',
            generation: state.generation,
            sequenceLength: state.round.items.length,
            recalled: state.recalled,
            status: state.status,
        };
    }
    if (!state.score) throw new Error('A submitted Remember & Decide round requires a score.');
    return { phase: 'result', generation: state.generation, round: state.round, score: state.score, status: state.status };
}

export function isTimedProjection(
    phase: RememberDecideProjection['phase']
): phase is TimedPhase {
    return phase === 'location'
        || phase === 'location-blank'
        || phase === 'decision'
        || phase === 'decision-blank';
}
