import { useCallback, useEffect, useRef, useState } from 'react';
import type { BlockPlan, TrialResponse } from '../../model/spatialSuite/types';

export type FeedbackKind = 'hit' | 'false-alarm' | 'miss';

export interface RunnerFrame {
    /** Current trial, or -1 before the first onset. */
    trialIndex: number;
    /** Stimulus is on screen. */
    visible: boolean;
    /** Ms since block start; only updated every frame when `continuous` is set. */
    elapsed: number;
    feedback: { kind: FeedbackKind; id: number } | null;
}

/**
 * Drives one block from a monotonic clock. Responses count once per trial, from
 * stimulus onset until the next onset; the first press is the one that is scored.
 */
export function useBlockRunner(
    plan: BlockPlan<unknown>,
    onFinish: (responses: TrialResponse[]) => void,
    { continuous = false, onInterrupted }: { continuous?: boolean; onInterrupted?: () => void } = {}
): RunnerFrame & { respond: () => void } {
    const [frame, setFrame] = useState<RunnerFrame>({ trialIndex: -1, visible: false, elapsed: 0, feedback: null });
    const responsesRef = useRef<TrialResponse[]>(plan.trials.map(() => ({ responded: false, rtMs: null })));
    const startRef = useRef(0);
    const indexRef = useRef(-1);
    const feedbackId = useRef(0);
    const finishRef = useRef(onFinish);
    finishRef.current = onFinish;
    const interruptedRef = useRef(onInterrupted);
    interruptedRef.current = onInterrupted;

    const giveFeedback = (kind: FeedbackKind) => {
        feedbackId.current += 1;
        setFrame((current) => ({ ...current, feedback: { kind, id: feedbackId.current } }));
    };

    useEffect(() => {
        const { onsets, trials, difficulty } = plan;
        const end = onsets[onsets.length - 1] + difficulty.stimulusMs + difficulty.isiMs;
        responsesRef.current = trials.map(() => ({ responded: false, rtMs: null }));
        startRef.current = performance.now();
        indexRef.current = -1;
        let raf = 0;
        let lastVisible = false;
        let lastIndex = -1;
        let done = false;

        // Trials shown while the page is hidden cannot be scored fairly.
        const onVisibility = () => {
            if (document.visibilityState !== 'hidden' || done) return;
            done = true;
            cancelAnimationFrame(raf);
            interruptedRef.current?.();
        };
        document.addEventListener('visibilitychange', onVisibility);

        const tick = () => {
            const elapsed = performance.now() - startRef.current;
            if (elapsed >= end) {
                done = true;
                finishRef.current(responsesRef.current);
                return;
            }
            let index = indexRef.current;
            while (index + 1 < onsets.length && onsets[index + 1] <= elapsed) index++;
            const visible = index >= 0 && elapsed - onsets[index] < difficulty.stimulusMs;
            if (index !== indexRef.current) {
                const previous = indexRef.current;
                if (previous >= 0 && trials[previous].isTarget && !responsesRef.current[previous].responded) {
                    giveFeedback('miss');
                }
                indexRef.current = index;
            }
            if (continuous || visible !== lastVisible || index !== lastIndex) {
                lastVisible = visible;
                lastIndex = index;
                setFrame((current) => ({ ...current, trialIndex: index, visible, elapsed }));
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            if (!done) cancelAnimationFrame(raf);
        };
    }, [plan, continuous]);

    const respond = useCallback(() => {
        const index = indexRef.current;
        if (index < 0) return;
        const response = responsesRef.current[index];
        if (response.responded) return;
        responsesRef.current[index] = {
            responded: true,
            rtMs: Math.round(performance.now() - startRef.current - plan.onsets[index]),
        };
        giveFeedback(plan.trials[index].isTarget ? 'hit' : 'false-alarm');
    }, [plan]);

    return { ...frame, respond };
}
