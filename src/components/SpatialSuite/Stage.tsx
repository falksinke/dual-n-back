import type { ReactNode } from 'react';
import type { DriftStimulus } from '../../model/spatialSuite/games/drift';
import type { PatternStimulus } from '../../model/spatialSuite/games/pattern';
import { moverAt, type RelayPlan } from '../../model/spatialSuite/games/relay';
import { ARENA_RADIUS, CENTRE, type ShiftStimulus } from '../../model/spatialSuite/games/shift';
import type { WayfinderStimulus } from '../../model/spatialSuite/games/wayfinder';
import type { Point } from '../../model/spatialSuite/types';

const SIZE = 1000;
const at = (p: Point) => ({ cx: p.x * SIZE, cy: p.y * SIZE });

function Frame({ children, label, round = false }: { children: ReactNode; label: string; round?: boolean }) {
    return (
        <svg className={`suite-stage ${round ? 'is-round' : ''}`} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
            {round
                ? <circle className="suite-stage__field" cx={500} cy={500} r={ARENA_RADIUS * SIZE} />
                : <rect className="suite-stage__field" x={4} y={4} width={SIZE - 8} height={SIZE - 8} rx={24} />}
            {children}
        </svg>
    );
}

export function DriftStage({ stimulus, visible }: { stimulus: DriftStimulus | null; visible: boolean }) {
    return (
        <Frame label="Open field">
            {stimulus && <circle className={`suite-dot ${visible ? 'is-on' : ''}`} {...at(stimulus.p)} r={20} />}
        </Frame>
    );
}

export function WayfinderStage({ stimulus, visible }: { stimulus: WayfinderStimulus | null; visible: boolean }) {
    return (
        <Frame label="Heading">
            <circle className="suite-fixation" cx={500} cy={500} r={6} />
            {stimulus && (
                <g className={`suite-arrow ${visible ? 'is-on' : ''}`} transform={`translate(500 500) rotate(${stimulus.dir * 45}) scale(1.35)`}>
                    {Array.from({ length: stimulus.steps }, (_, i) => (
                        <path key={i} d={`M -70 ${40 - i * 78} L 0 ${-30 - i * 78} L 70 ${40 - i * 78}`}
                            transform={`translate(0 ${(stimulus.steps - 1) * 39})`} />
                    ))}
                </g>
            )}
        </Frame>
    );
}

export function PatternStage({ stimulus, visible }: { stimulus: PatternStimulus | null; visible: boolean }) {
    return (
        <Frame label="Pattern field">
            {stimulus?.kind === 'shape' && (
                <g className={`suite-glyphs ${visible ? 'is-on' : ''}`}>
                    {stimulus.points.map((p, i) => <circle key={i} className="suite-dot is-on" {...at(p)} r={18} />)}
                </g>
            )}
            {stimulus?.kind === 'relation' && (
                <g className={`suite-glyphs ${visible ? 'is-on' : ''}`}>
                    <rect className="suite-square" x={stimulus.b.x * SIZE - 32} y={stimulus.b.y * SIZE - 32} width={64} height={64} rx={6} />
                    <circle className="suite-dot is-on" {...at(stimulus.a)} r={30} />
                </g>
            )}
        </Frame>
    );
}

export function ShiftStage({ stimulus, visible }: { stimulus: ShiftStimulus | null; visible: boolean }) {
    const rim = ARENA_RADIUS * SIZE;
    return (
        <Frame label="Polar field" round>
            {[0.1, 0.2, 0.3, 0.4].map((r) => <circle key={r} className="suite-ring" cx={500} cy={500} r={r * SIZE} />)}
            <circle className="suite-fixation" cx={CENTRE.x * SIZE} cy={CENTRE.y * SIZE} r={5} />
            {stimulus && (
                <g className={`suite-glyphs ${visible ? 'is-on' : ''}`}>
                    <g transform={`translate(500 500) rotate(${stimulus.frame})`}>
                        <line className="suite-marker__line" x1={0} y1={0} x2={rim - 40} y2={0} />
                        <path className="suite-marker" d={`M ${rim - 4} 0 L ${rim - 58} -26 L ${rim - 58} 26 Z`} />
                    </g>
                    {stimulus.axis && (
                        <line className="suite-axis"
                            x1={stimulus.axis === 'vertical' ? 500 : 500 - rim} y1={stimulus.axis === 'vertical' ? 500 - rim : 500}
                            x2={stimulus.axis === 'vertical' ? 500 : 500 + rim} y2={stimulus.axis === 'vertical' ? 500 + rim : 500} />
                    )}
                    <circle className="suite-dot is-on" {...at(stimulus.p)} r={20} />
                </g>
            )}
        </Frame>
    );
}

export type RelayView = 'preview' | 'play' | 'select';

export function RelayStage({ plan, elapsed, flashing, view, selected, onToggle }: {
    plan: RelayPlan;
    elapsed: number;
    /** Object that is flashing now, if any. */
    flashing: number | null;
    view: RelayView;
    selected: number[];
    onToggle: (object: number) => void;
}) {
    const highlightTracked = view === 'preview' && elapsed < plan.previewMs - 600;
    return (
        <Frame label={view === 'select' ? 'Pick the two discs you tracked' : 'Moving discs'}>
            {plan.movers.map((mover, object) => {
                const p = moverAt(mover, elapsed);
                const classes = [
                    'suite-disc',
                    highlightTracked && plan.tracked.includes(object) ? 'is-tracked' : '',
                    flashing === object ? 'is-flash' : '',
                    selected.includes(object) ? 'is-selected' : '',
                ].filter(Boolean).join(' ');
                if (view !== 'select') return <circle key={object} className={classes} {...at(p)} r={30} />;
                return (
                    <circle key={object} className={`${classes} is-choosable`} {...at(p)} r={30}
                        role="button" tabIndex={0} aria-pressed={selected.includes(object)}
                        aria-label={`Disc ${object + 1}`}
                        onClick={() => onToggle(object)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onToggle(object);
                            }
                        }} />
                );
            })}
        </Frame>
    );
}
