import { useEffect, useState } from 'react';
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
    const [pressed, setPressed] = useState(false);

    useEffect(() => {
        if (blocked) setPressed(false);
    }, [blocked]);

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
