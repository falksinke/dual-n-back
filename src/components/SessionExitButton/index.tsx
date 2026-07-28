import { useGameStore } from '../../store/gameStore';
import './SessionExitButton.scss';

/** Touch-friendly abort during countdown / trials (Escape remains). */
const SessionExitButton = () => {
    const cancelGame = useGameStore((state) => state.cancelGame);
    const visible = useGameStore(
        (state) =>
            state.game !== null ||
            state.countdown !== null ||
            state.adaptiveSession?.pendingContinue === true
    );

    if (!visible) return null;

    return (
        <button
            type="button"
            className="session-exit-btn"
            aria-label="Exit session"
            onClick={() => cancelGame()}
        >
            <span aria-hidden="true">✕</span>
        </button>
    );
};

export default SessionExitButton;
