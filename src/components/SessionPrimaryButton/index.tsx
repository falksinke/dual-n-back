import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import './SessionPrimaryButton.scss';

interface SessionPrimaryButtonProps {
    label: string;
    disabled?: boolean;
}

/** Touch-friendly Start / Continue; Space remains available via keyboard controls. */
const SessionPrimaryButton = ({ label, disabled = false }: SessionPrimaryButtonProps) => {
    const startGame = useGameStore((state) => state.startGame);
    const sessionBlocked = useGameStore(
        (state) => state.game !== null || state.countdown !== null
    );
    const blocked = sessionBlocked || disabled;
    const [pressed, setPressed] = useState(false);

    const clearPress = () => setPressed(false);
    const startPress = () => {
        if (!blocked) setPressed(true);
    };

    return (
        <div
            className="session-primary-wrap haptic-host"
            onPointerDownCapture={startPress}
            onPointerUpCapture={clearPress}
            onPointerCancelCapture={clearPress}
            onPointerLeave={clearPress}
        >
            <button
                type="button"
                className={`session-primary-btn${pressed ? ' is-pressed' : ''}`}
                disabled={blocked}
                data-haptic="light"
                onClick={() => startGame()}
            >
                {label}
                <span className="session-primary-btn-hint" aria-hidden="true">
                    or <kbd>Space</kbd>
                </span>
            </button>
        </div>
    );
};

export default SessionPrimaryButton;
