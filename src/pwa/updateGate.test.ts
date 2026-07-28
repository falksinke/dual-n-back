import { describe, expect, it } from 'vitest';
import { shouldApplyWaitingUpdate } from './updateGate';

describe('shouldApplyWaitingUpdate', () => {
    it('is true when idle', () => {
        expect(
            shouldApplyWaitingUpdate({
                game: null,
                countdown: null,
                pendingContinue: false,
            })
        ).toBe(true);
    });

    it('is false when a game is active', () => {
        expect(
            shouldApplyWaitingUpdate({
                game: {},
                countdown: null,
                pendingContinue: false,
            })
        ).toBe(false);
    });

    it('is false during countdown', () => {
        expect(
            shouldApplyWaitingUpdate({
                game: null,
                countdown: 2,
                pendingContinue: false,
            })
        ).toBe(false);
    });

    it('is false on Adaptive interstitial (pendingContinue)', () => {
        expect(
            shouldApplyWaitingUpdate({
                game: null,
                countdown: null,
                pendingContinue: true,
            })
        ).toBe(false);
    });
});
