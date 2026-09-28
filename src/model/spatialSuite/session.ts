import type { GameId, Rng } from './types';

/** Drift and Pattern carry the core demand; Relay has the weakest evidence. */
export const GAME_WEIGHTS: Record<GameId, number> = {
    drift: 3,
    pattern: 3,
    wayfinder: 2,
    shift: 2,
    relay: 1,
};

export const GAMES_PER_SESSION = 3;
/** Four blocks of 20 + n trials is roughly five minutes of play per game. */
export const BLOCKS_PER_SEGMENT = 4;

function weightedDraw(rng: Rng, weights: Partial<Record<GameId, number>>): GameId {
    const entries = Object.entries(weights) as [GameId, number][];
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = rng() * total;
    for (const [game, weight] of entries) {
        roll -= weight;
        if (roll < 0) return game;
    }
    return entries[entries.length - 1][0];
}

/** Three different games, weighted, never the same set as the previous session. */
export function drawSessionMix(rng: Rng, previous: GameId[] | null): GameId[] {
    const key = (mix: GameId[]) => [...mix].sort().join(',');
    let mix: GameId[] = [];
    for (let attempt = 0; attempt < 30; attempt++) {
        const remaining: Partial<Record<GameId, number>> = { ...GAME_WEIGHTS };
        mix = [];
        while (mix.length < GAMES_PER_SESSION) {
            const game = weightedDraw(rng, remaining);
            delete remaining[game];
            mix.push(game);
        }
        if (!previous || key(mix) !== key(previous)) return mix;
    }
    return mix;
}
