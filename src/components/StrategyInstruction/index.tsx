import { useEffect, useState } from 'react';
import './StrategyInstruction.scss';

interface StrategyInstructionProps {
    n: number;
    onContinue: () => void;
}

const EXIT_MS = 220;

const StrategyInstruction = ({ n, onContinue }: StrategyInstructionProps) => {
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (!leaving) return;
        const id = window.setTimeout(() => onContinue(), EXIT_MS);
        return () => window.clearTimeout(id);
    }, [leaving, onContinue]);

    return (
        <div
            className={`strategy-instruction${leaving ? ' is-leaving' : ''}`}
            role="dialog"
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
