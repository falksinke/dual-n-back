export type UpdateGateState = {
    game: unknown | null;
    countdown: number | null;
    pendingContinue: boolean;
};

/** Waiting SW may reload only when no session/countdown/Adaptive interstitial is active. */
export function shouldApplyWaitingUpdate(state: UpdateGateState): boolean {
    return state.game === null && state.countdown === null && !state.pendingContinue;
}
