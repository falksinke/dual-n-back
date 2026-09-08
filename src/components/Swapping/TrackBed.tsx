import { useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { GRID_DIMENSIONS, getArrangementSize } from '../../model/swapping';
import type { SwappingConfig, SwappingLayout } from '../../model/swapping/types';

/** One row at every breakpoint. Grid dimensions never change with viewport width. */
export function boardStyle(config: SwappingConfig): CSSProperties {
    return {
        '--swapping-columns': config.layout === 'sequence'
            ? getArrangementSize(config)
            : GRID_DIMENSIONS[config.layout].columns,
    } as CSSProperties;
}

export default function TrackBed({ layout, children }: {
    layout: SwappingLayout;
    children: ReactNode;
}) {
    const viewport = useRef<HTMLDivElement | null>(null);
    const id = useId();
    const sequence = layout === 'sequence';

    // Native scrolling only; this never changes slot selection, order or game state.
    const pan = (direction: -1 | 1): void => {
        const element = viewport.current;
        if (element) element.scrollLeft += direction * element.clientWidth * 0.75;
    };

    return (
        <div className={`swapping-track is-${sequence ? 'sequence' : 'grid'}`}>
            <div className="swapping-track__legend">
                <span>{sequence ? 'Fixed bays · left to right' : 'Loading yard · top-down view'}</span>
                {!sequence && <span>Rows ↓ · columns →</span>}
            </div>
            <div
                className="swapping-track__viewport"
                ref={viewport}
                id={`${id}-track`}
                role="region"
                aria-label={sequence ? 'Continuous track; scroll to see all positions' : 'Fixed loading-yard coordinates'}
                aria-describedby={sequence ? `${id}-help` : undefined}
                tabIndex={sequence ? 0 : undefined}
            >
                {children}
            </div>
            {sequence && (
                <div className="swapping-track__navigation">
                    <button type="button" onClick={() => pan(-1)} aria-label="Scroll to earlier positions" aria-controls={`${id}-track`}>←</button>
                    <p id={`${id}-help`}>One continuous track. Swipe, scroll or use the arrows; positions never wrap to a new row.</p>
                    <button type="button" onClick={() => pan(1)} aria-label="Scroll to later positions" aria-controls={`${id}-track`}>→</button>
                </div>
            )}
        </div>
    );
}
