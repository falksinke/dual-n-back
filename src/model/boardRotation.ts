/**
 * Rotating board: between some trials the whole board snaps round by a quarter,
 * half or three-quarter turn, either way. Stimuli keep their board index, so a
 * position match is by place on the board and the remembered square turns with it.
 */

/** Share of stimulus offsets followed by a turn. */
export const ROTATION_CHANCE = 0.25;

export const TURNS = [90, 180, 270, -90, -180, -270] as const;

/** A signed turn in degrees, or null when the board stays put this time. */
export function nextTurn(rng: () => number = Math.random): number | null {
    if (rng() >= ROTATION_CHANCE) return null;
    return TURNS[Math.floor(rng() * TURNS.length)];
}

/** Quick enough to finish inside the gap, slow enough to follow the direction. */
export const turnDurationMs = (turn: number): number => 160 + (Math.abs(turn) / 90) * 110;
