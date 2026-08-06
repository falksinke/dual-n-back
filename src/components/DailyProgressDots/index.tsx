import {
    sessionEndIndices,
    splitRoundsIntoSessions,
} from '../../model/dailyProgress';
import { useGameStore } from '../../store/gameStore';
import './DailyProgressDots.scss';

export interface DailyProgressDotsProps {
    /** Override store for tests. */
    completedCount?: number;
    dailyRounds?: number;
    dailySessions?: number;
}

const DailyProgressDots = ({
    completedCount: completedProp,
    dailyRounds: roundsProp,
    dailySessions: sessionsProp,
}: DailyProgressDotsProps) => {
    const storeCompleted = useGameStore((s) => s.dailyProgress.completedCount);
    const storeRounds = useGameStore((s) => s.settings.dailyRounds);
    const storeSessions = useGameStore((s) => s.settings.dailySessions);

    const dailyRounds = roundsProp ?? storeRounds;
    const dailySessions = sessionsProp ?? storeSessions;
    const completedCount = Math.min(
        completedProp ?? storeCompleted,
        Math.max(0, dailyRounds)
    );

    if (dailyRounds <= 0) {
        return null;
    }

    const sizes = splitRoundsIntoSessions(dailyRounds, dailySessions);
    const endSet = new Set(sessionEndIndices(sizes));
    const label = `Daily progress: ${completedCount} of ${dailyRounds} rounds`;

    let flatIndex = 0;
    return (
        <div className="daily-progress-dots" aria-label={label}>
            <div className="daily-progress-dots__row" aria-hidden="true">
                {sizes.map((size, groupIdx) => (
                    <div key={groupIdx} className="daily-progress-dots__session">
                        {Array.from({ length: size }, () => {
                            const i = flatIndex++;
                            const filled = i < completedCount;
                            const sessionEnd = filled && endSet.has(i);
                            return (
                                <span
                                    key={i}
                                    className={[
                                        'daily-progress-dots__dot',
                                        filled ? 'is-filled' : 'is-empty',
                                        sessionEnd ? 'is-session-end' : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DailyProgressDots;
