import type { MouseEvent, PointerEvent } from 'react';
import { useGameStore } from '../../store/gameStore';
import './CountdownFlash.scss';

const CountdownFlash = () => {
    const countdown = useGameStore((state) => state.countdown);
    const skipCountdown = useGameStore((state) => state.skipCountdown);

    if (countdown === null) return null;

    const startImmediately = () => skipCountdown();

    const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        startImmediately();
    };

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        startImmediately();
    };

    return (
        <div className="countdown-flash">
            <button
                type="button"
                className="countdown-flash-skip"
                aria-label="Start session immediately"
                onPointerDown={handlePointerDown}
                onClick={handleClick}
                onKeyDown={(event) => {
                    // Keep Space's native button activation ahead of the app shortcut.
                    if (event.key === ' ') event.stopPropagation();
                }}
            >
                <span key={countdown} className="countdown-flash-digit" aria-hidden="true">
                    {countdown}
                </span>
            </button>
            <span
                className="countdown-flash-announcement"
                role="status"
                aria-live="assertive"
                aria-atomic="true"
            >
                Countdown {countdown}
            </span>
        </div>
    );
};

export default CountdownFlash;
