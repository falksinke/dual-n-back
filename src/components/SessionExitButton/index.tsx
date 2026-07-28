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
        <div className="session-exit-wrap haptic-host">
            <button
                type="button"
                className="session-exit-btn"
                aria-label="Exit session"
                data-haptic="light"
                onClick={() => cancelGame()}
            >
                <span aria-hidden="true">✕</span>
            </button>
        </div>
    );
};

export default SessionExitButton;
