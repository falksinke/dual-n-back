export type FreePlayProgressionAction = 'promote' | 'demote' | 'hold';

export interface FreePlayProgressionDecision {
    action: FreePlayProgressionAction;
    level: number;
    failStreak: number;
    reason: string;
}

/**
 * Free-play Match%-based level progression (n only).
 * Do not reuse Adaptive `decideProgression` — that API uses ladder levelIndex, not Free-play n.
 */
export function decideFreePlayLevelProgression(input: {
    level: number;
    failStreak: number;
    matchPct: number;
    promotePct: number;
    demotePct: number;
    failsToDemote: number;
    demoteRequiresConsecutive: boolean;
    minLevel?: number;
}): FreePlayProgressionDecision {
    const minLevel = input.minLevel ?? 1;
    const level = Math.max(minLevel, Math.floor(input.level));
    const failStreak = Math.max(0, Math.floor(input.failStreak));
    const matchPct = Number.isFinite(input.matchPct) ? input.matchPct : 0;
    const promotePct =
        typeof input.promotePct === 'number' && Number.isFinite(input.promotePct)
            ? input.promotePct
            : 80;
    const failsToDemote = Math.max(
        1,
        Math.floor(
            typeof input.failsToDemote === 'number' && Number.isFinite(input.failsToDemote)
                ? input.failsToDemote
                : 3
        )
    );
    const demotePct =
        typeof input.demotePct === 'number' && Number.isFinite(input.demotePct)
            ? input.demotePct
            : promotePct;

    if (matchPct >= promotePct) {
        return {
            action: 'promote',
            level: level + 1,
            failStreak: 0,
            reason: `Match ${matchPct}% ≥ ${promotePct}% — promote one level`,
        };
    }

    const isDemotionFail = matchPct < demotePct;
    const nextFail = isDemotionFail
        ? failStreak + 1
        : input.demoteRequiresConsecutive
          ? 0
          : failStreak;
    if (nextFail >= failsToDemote) {
        if (level <= minLevel) {
            return {
                action: 'hold',
                level: minLevel,
                failStreak: 0,
                reason: `Fail streak ${nextFail} at minimum level — reset streak`,
            };
        }
        return {
            action: 'demote',
            level: level - 1,
            failStreak: 0,
            reason: input.demoteRequiresConsecutive
                ? `${failsToDemote} blocks below ${demotePct}% in a row — demote one level`
                : `${failsToDemote} blocks below ${demotePct}% — demote one level`,
        };
    }

    return {
        action: 'hold',
        level,
        failStreak: nextFail,
        reason: isDemotionFail
            ? `Match ${matchPct}% < ${demotePct}% — demotion block ${nextFail}/${failsToDemote}`
            : input.demoteRequiresConsecutive
              ? `Match ${matchPct}% ≥ ${demotePct}% — reset demotion blocks`
              : `Match ${matchPct}% ≥ ${demotePct}% — demotion blocks ${nextFail}/${failsToDemote}`,
    };
}
