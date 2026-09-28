import { REST_MINUTE_OPTIONS, idleRestTimer, remainingRestSeconds } from '../../model/restTimer';
import { useGameStore } from '../../store/gameStore';
import './RestTimer.scss';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatRemaining(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

interface RestTimerProps {
    nowMs: number;
}

const RestTimer = ({ nowMs }: RestTimerProps) => {
    const timer = useGameStore((state) => state.restTimer);
    const setRestMinutes = useGameStore((state) => state.setRestMinutes);

    const remainingSeconds = remainingRestSeconds(timer, nowMs);
    const totalSeconds = timer.minutes * 60;
    const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    const ready = remainingSeconds === 0;

    return (
        <section
            className="rest-timer"
            aria-label="Rest timer"
            onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                event.stopPropagation();
                if (event.repeat) return;
                const state = useGameStore.getState();
                if (state.game !== null || state.countdown !== null) return;
                // Skip this rest without changing the saved duration preference.
                useGameStore.setState({ restTimer: idleRestTimer(state.restTimer.minutes) });
                state.startGame();
            }}
        >
            <div className="rest-timer-circle" aria-live="polite" aria-atomic="true">
                <svg viewBox="0 0 100 100" aria-hidden="true">
                    <circle className="rest-timer-track" cx="50" cy="50" r={RADIUS} />
                    <circle
                        className="rest-timer-progress"
                        cx="50"
                        cy="50"
                        r={RADIUS}
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                    />
                </svg>
                <span className="rest-timer-value">
                    {ready ? 'Ready' : formatRemaining(remainingSeconds)}
                </span>
            </div>

            <span className="session-primary-btn-hint">Enter to skip rest and start</span>
            <div className="rest-timer-options" aria-label="Rest duration">
                {REST_MINUTE_OPTIONS.map((minutes) => (
                    <button
                        key={minutes}
                        type="button"
                        className={timer.minutes === minutes ? 'is-selected' : ''}
                        aria-pressed={timer.minutes === minutes}
                        onClick={() => setRestMinutes(minutes)}
                    >
                        {minutes === 0 ? 'Continue' : `${minutes} min`}
                    </button>
                ))}
            </div>
        </section>
    );
};

export default RestTimer;
