import type { BlockLog, TrackId } from '../../model/spatialSuite/types';
import { TRACKS } from '../../model/spatialSuite/storage';
import { TRACK_NAMES } from './copy';

const WIDTH = 240;
const HEIGHT = 56;
const RECENT = 40;

function Sparkline({ blocks }: { blocks: BlockLog[] }) {
    const levels = blocks.map((b) => b.level);
    const max = Math.max(4, ...levels);
    const step = blocks.length > 1 ? WIDTH / (blocks.length - 1) : 0;
    const y = (level: number) => HEIGHT - 6 - ((level - 1) / (max - 1)) * (HEIGHT - 12);
    const points = levels.map((level, i) => `${(i * step).toFixed(1)},${y(level).toFixed(1)}`).join(' ');
    return (
        <svg className="suite-spark" viewBox={`-4 0 ${WIDTH + 8} ${HEIGHT}`} aria-hidden="true" preserveAspectRatio="none">
            <line x1={0} x2={WIDTH} y1={y(1)} y2={y(1)} className="suite-spark__base" />
            {levels.length > 1
                ? <polyline points={points} className="suite-spark__line" />
                : <circle cx={WIDTH / 2} cy={y(levels[0])} r={3} className="suite-spark__dot" />}
        </svg>
    );
}

/** Level over time per game track. Levels describe these games only. */
export default function ProgressView({ blocks }: { blocks: BlockLog[] }) {
    const trained = blocks.filter((b) => !b.holdout);
    const rows = TRACKS
        .map((track): [TrackId, BlockLog[]] => [track, trained.filter((b) => b.track === track).slice(-RECENT)])
        .filter(([, list]) => list.length > 0);
    const holdouts = blocks.filter((b) => b.holdout);

    if (rows.length === 0) {
        return <p className="suite-muted">Your level per game will appear here after your first block.</p>;
    }

    return (
        <div className="suite-progress">
            <ul>
                {rows.map(([track, list]) => {
                    const last = list[list.length - 1];
                    return (
                        <li key={track}>
                            <div className="suite-progress__label">
                                <strong>{TRACK_NAMES[track]}</strong>
                                <span>Level {last.level} · {list.length} block{list.length === 1 ? '' : 's'}</span>
                            </div>
                            <Sparkline blocks={list} />
                            <span className="suite-progress__latest" aria-label={`Latest block accuracy ${Math.round(last.accuracy * 100)} percent at ${last.n} back`}>
                                {last.n}-back · {Math.round(last.accuracy * 100)}%
                            </span>
                        </li>
                    );
                })}
            </ul>
            {holdouts.length > 0 && (
                <p className="suite-muted">
                    Monthly checks on the untrained rule:{' '}
                    {holdouts.map((b) => `${new Date(b.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${Math.round(b.accuracy * 100)}% at ${b.n}-back`).join(' · ')}
                </p>
            )}
        </div>
    );
}
