import { useEffect, useRef, useState } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';
import './StrategyInstruction.scss';

interface StrategyInstructionProps {
    n: number;
    onContinue: () => void;
}

const EXIT_MS = 220;

function getExitDelay(): number {
    if (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
        return 0;
    }
    return EXIT_MS;
}

const StrategyInstruction = ({ n, onContinue }: StrategyInstructionProps) => {
    const [leaving, setLeaving] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const ctaRef = useRef<HTMLButtonElement>(null);

    useModalA11y({
        active: !leaving,
        onEscape: () => {},
        initialFocusRef: ctaRef,
        enableTrap: false,
        restoreTarget: '.session-primary-btn',
        containerRef,
    });

    useEffect(() => {
        if (!leaving) return;
        const id = window.setTimeout(() => onContinue(), getExitDelay());
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
