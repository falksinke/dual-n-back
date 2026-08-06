import { useEffect, useRef, useState } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { getModalExitDelay } from '../utils/modalExit';
import './StrategyInstruction.scss';

interface StrategyInstructionProps {
    n: number;
    onContinue: () => void;
}

// Plan policy: Escape must not commit — only the CTA starts teach. The key is
// still captured (and blocked from the game) while the dialog is open.
const noopEscape = (): void => undefined;

const StrategyInstruction = ({ n, onContinue }: StrategyInstructionProps) => {
    const [leaving, setLeaving] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const ctaRef = useRef<HTMLButtonElement>(null);

    // `active` stays true through the exit animation so the keyboard gate and
    // focus restore span the dialog's full visible lifetime (unmount).
    useModalA11y({
        active: true,
        onEscape: noopEscape,
        initialFocusRef: ctaRef,
        enableTrap: false,
        restoreTarget: '.session-primary-btn',
        containerRef,
    });

    useEffect(() => {
        if (!leaving) return;
        const id = window.setTimeout(() => onContinue(), getModalExitDelay());
        return () => window.clearTimeout(id);
    }, [leaving, onContinue]);

    return (
        <div
            ref={containerRef}
            className={`strategy-instruction${leaving ? ' is-leaving' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="strategy-instruction-title"
        >
            <div className="strategy-instruction__panel">
                <h2 id="strategy-instruction-title" className="strategy-instruction__title">
                    Cyclic updating — {n}-back
                </h2>
                <p className="strategy-instruction__body">
                    Do not shift the whole list. Keep {n} positions. The first {n} cues only fill those
                    slots. From cue {n + 1} on: compare with the active slot, replace it, then advance.
                </p>
                <ol className="strategy-instruction__list">
                    <li>Fill the first {n} slots (just remember)</li>
                    <li>Compare the active slot to what you see</li>
                    <li>Replace that slot with the current cue</li>
                    <li>Advance to the next slot</li>
                </ol>
                <button
                    ref={ctaRef}
                    type="button"
                    className="strategy-instruction__cta"
                    onClick={() => setLeaving(true)}
                    disabled={leaving}
                >
                    Start teach
                </button>
            </div>
        </div>
    );
};

export default StrategyInstruction;
