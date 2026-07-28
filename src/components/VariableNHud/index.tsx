import './VariableNHud.scss';

interface VariableNHudProps {
    n: number;
}

const VariableNHud = ({ n }: VariableNHudProps) => (
    <div
        className="variable-n-hud"
        aria-live="assertive"
        aria-atomic="true"
        aria-label={`${n}-back`}
    >
        <span className="variable-n-hud-label">Match</span>
        <span key={n} className="variable-n-hud-value">
            {n}
            <span className="variable-n-hud-suffix">-back</span>
        </span>
    </div>
);

export default VariableNHud;
