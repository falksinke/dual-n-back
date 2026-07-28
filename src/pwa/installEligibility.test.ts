import { describe, expect, it } from 'vitest';
import { shouldShowInstallNudge } from './installEligibility';

const engaged = {
    visitCount: 2,
    blocksCompleted: 0,
    installNudgeDismissedAt: null,
};

describe('shouldShowInstallNudge', () => {
    it('shows for engaged iOS Safari users', () => {
        expect(
            shouldShowInstallNudge(engaged, {
                standalone: false,
                iosSafari: true,
                hasDeferredPrompt: false,
            })
        ).toBe(true);
    });

    it('hides when already standalone', () => {
        expect(
            shouldShowInstallNudge(engaged, {
                standalone: true,
                iosSafari: true,
                hasDeferredPrompt: true,
            })
        ).toBe(false);
    });

    it('hides within 7-day dismiss snooze', () => {
        const now = 1_000_000_000_000;
        expect(
            shouldShowInstallNudge(
                { ...engaged, installNudgeDismissedAt: now - 1000 },
                {
                    standalone: false,
                    iosSafari: true,
                    now,
                }
            )
        ).toBe(false);
    });

    it('hides when not iOS and no deferred BIP', () => {
        expect(
            shouldShowInstallNudge(engaged, {
                standalone: false,
                iosSafari: false,
                hasDeferredPrompt: false,
            })
        ).toBe(false);
    });

    it('hides on first visit with zero completions', () => {
        expect(
            shouldShowInstallNudge(
                {
                    visitCount: 1,
                    blocksCompleted: 0,
                    installNudgeDismissedAt: null,
                },
                {
                    standalone: false,
                    iosSafari: true,
                    hasDeferredPrompt: true,
                }
            )
        ).toBe(false);
    });

    it('shows when a block was completed even on visit 1', () => {
        expect(
            shouldShowInstallNudge(
                {
                    visitCount: 1,
                    blocksCompleted: 1,
                    installNudgeDismissedAt: null,
                },
                {
                    standalone: false,
                    hasDeferredPrompt: true,
                    iosSafari: false,
                }
            )
        ).toBe(true);
    });
});
