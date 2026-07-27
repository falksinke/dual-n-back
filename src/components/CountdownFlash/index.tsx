import { useGameStore } from '../../store/gameStore';
import './CountdownFlash.scss';

const CountdownFlash = () => {
    const countdown = useGameStore((state) => state.countdown);

    if (countdown === null) return null;

    return (
        <div className="countdown-flash" role="status" aria-live="assertive" aria-atomic="true">
            <span key={countdown} className="countdown-flash-digit">
                {countdown}
            </span>
        </div>
    );
};

export default CountdownFlash;
