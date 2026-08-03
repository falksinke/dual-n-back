import './StrategyInstruction.scss';

interface StrategyInstructionProps {
    n: number;
    onContinue: () => void;
}

const StrategyInstruction = ({ n, onContinue }: StrategyInstructionProps) => (
    <div className="strategy-instruction" role="dialog" aria-labelledby="strategy-instruction-title">
        <div className="strategy-instruction__panel">
            <h2 id="strategy-instruction-title" className="strategy-instruction__title">
                Cyclic updating — {n}-back
            </h2>
            <p className="strategy-instruction__body">
                Do not shift the whole list. Keep {n} positions. On every trial, compare the current
                stimulus with the active position, replace that position, then advance.
            </p>
            <ol className="strategy-instruction__list">
                <li>Retrieve the active slot</li>
                <li>Compare → respond</li>
                <li>Replace that slot</li>
                <li>Advance to the next slot</li>
            </ol>
            <button type="button" className="strategy-instruction__cta" onClick={onContinue}>
                Start guided practice
            </button>
        </div>
    </div>
);

export default StrategyInstruction;
