import { useGameStore } from '../../store/gameStore';
import './SessionPrimaryButton.scss';

interface SessionPrimaryButtonProps {
    label: string;
}

/** Touch-friendly Start / Continue; Space remains available via keyboard controls. */
const SessionPrimaryButton = ({ label }: SessionPrimaryButtonProps) => {
    const startGame = useGameStore((state) => state.startGame);
    const blocked = useGameStore(
        (state) => state.game !== null || state.countdown !== null
    );

    return (
        <button
            type="button"
            className="session-primary-btn"
            disabled={blocked}
            onClick={() => startGame()}
        >
            {label}
            <span className="session-primary-btn-hint">
                or <kbd>Space</kbd>
            </span>
        </button>
    );
};

export default SessionPrimaryButton;
