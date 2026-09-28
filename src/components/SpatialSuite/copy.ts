import type { DialId, DifficultyChange, GameId, TrackId } from '../../model/spatialSuite/types';

export interface GameCopy {
    name: string;
    demand: string;
    summary: string;
    experimental?: boolean;
}

export const GAMES: Record<GameId, GameCopy> = {
    drift: {
        name: 'Drift',
        demand: 'Hold a spot in open space',
        summary: 'A dot lands anywhere on an open field. There are no cells to name, so you hold the spot itself.',
    },
    pattern: {
        name: 'Pattern',
        demand: 'Match shapes and relations',
        summary: 'Alternates constellations (same shape, any size or place) with pairs (same direction between two objects).',
    },
    wayfinder: {
        name: 'Wayfinder',
        demand: 'Keep your bearings without a map',
        summary: 'Arrows move you around an invisible field. Keep your position updated and notice when you return.',
    },
    shift: {
        name: 'Shift',
        demand: 'Match under changing rules',
        summary: 'The rule for what counts as the same spot changes from trial to trial. Each session deals a new deck.',
    },
    relay: {
        name: 'Relay',
        demand: 'Track and update together',
        summary: 'Discs drift and flash. Match flash locations while you keep two discs in sight until the end.',
        experimental: true,
    },
};

export const GAME_ORDER: GameId[] = ['drift', 'pattern', 'wayfinder', 'shift', 'relay'];

export const TRACK_NAMES: Record<TrackId, string> = {
    drift: 'Drift',
    wayfinder: 'Wayfinder',
    'pattern-shape': 'Pattern · shapes',
    'pattern-relation': 'Pattern · relations',
    shift: 'Shift',
    relay: 'Relay',
};

/** "the previous dot" / "the dot 3 back". */
export const back = (n: number, noun: string): string => (n === 1 ? `the previous ${noun}` : `the ${noun} ${n} back`);

export function instruction(track: TrackId, n: number): string {
    switch (track) {
        case 'drift':
            return `Press Match when the dot lands on the spot of ${back(n, 'dot')}. Very close counts.`;
        case 'wayfinder':
            return `Each arrow moves you 1 to 3 steps. Press Match when you are back where you stood ${n} moves ago.`;
        case 'pattern-shape':
            return `Press Match when the constellation has the same shape as ${back(n, 'one')}, whatever its size or place. A mirror image is not the same shape.`;
        case 'pattern-relation':
            return `Press Match when the dot sits in the same direction from the square as in ${back(n, 'pair')}. Swapped places do not count.`;
        case 'shift':
            return `Every trial shows its rule. Compare the dot with ${back(n, 'dot')} under that rule.`;
        case 'relay':
            return `Keep your eyes on the two highlighted discs; you will pick them out at the end. Meanwhile, press Match when a flash lands where ${back(n, 'flash')} was.`;
    }
}

const seconds = (isiMs: number): string => `${Number(((isiMs + 500) / 1000).toFixed(2))} s`;

function describeDial(track: TrackId, dial: DialId, value: number, up: boolean): string {
    switch (dial) {
        case 'n': return `now ${value} back`;
        case 'lure': return `lures ${up ? 'rise' : 'drop'} to ${Math.round(value * 100)}%`;
        case 'isi': return `pace ${up ? 'quickens' : 'slows'} to ${seconds(value)} per item`;
        case 'extra':
            if (track === 'drift') return `the match zone ${up ? 'tightens' : 'widens'} to ${Math.round(value * 100)}% of the field`;
            if (track === 'shift') return `rule switches ${up ? 'rise' : 'drop'} to ${Math.round(value * 100)}% of trials`;
            if (track === 'pattern-shape') return `${value} dots per shape`;
            return `${value} discs`;
    }
}

export function describeChange(track: TrackId, change: DifficultyChange): string {
    if (change.direction === 'hold' || !change.dial || change.to === null) return 'Holding at this level for the next block.';
    const up = change.direction === 'up';
    return `${up ? 'Up a level' : 'Eased off'}: ${describeDial(track, change.dial, change.to, up)}.`;
}

export const paceLabel = seconds;
