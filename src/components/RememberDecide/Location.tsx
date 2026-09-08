import { useRef } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import { MEMORY_GRID_SIZE } from '../../model/rememberDecide';
import type { MemoryLocation } from '../../model/rememberDecide';
import Greenhouse from './Greenhouse';
import { Pot } from './art/GardenArtwork';

interface MemoryGridProps {
    readonly active?: MemoryLocation;
    readonly label: string;
    readonly compact?: boolean;
    /** Used only for the submitted garden in Result; never fed the true route. */
    readonly submitted?: readonly MemoryLocation[];
}

export function MemoryGrid({ active, label, compact = false, submitted = [] }: MemoryGridProps) {
    return (
        <div
            className={`remember-decide-memory-grid${compact ? ' is-compact' : ''}`}
            role="img"
            aria-label={label}
        >
            {Array.from({ length: MEMORY_GRID_SIZE * MEMORY_GRID_SIZE }, (_, index) => {
                const row = Math.floor(index / MEMORY_GRID_SIZE);
                const column = index % MEMORY_GRID_SIZE;
                const isActive = active?.row === row && active.column === column;
                const lanternCount = submitted.filter((location) => location.row === row && location.column === column).length;
                return (
                    <div key={index} className={`remember-decide-memory-cell${isActive ? ' is-active' : ''}`} aria-hidden="true">
                        <Pot landing={isActive} lanternCount={lanternCount} />
                    </div>
                );
            })}
        </div>
    );
}

interface LocationProps {
    readonly location: MemoryLocation;
    readonly itemIndex: number;
    readonly itemCount: number;
    readonly onMounted: () => void;
}

export default function Location({ location, itemIndex, itemCount, onMounted }: LocationProps) {
    const headingRef = useRef<HTMLHeadingElement | null>(null);

    useMountEffect(() => {
        onMounted();
        if (!(document.activeElement instanceof HTMLElement && document.activeElement.dataset.persistentControl)) {
            headingRef.current?.focus();
        }
    });

    return (
        <section className="remember-decide-phase" aria-labelledby="remember-decide-location-title">
            <div className="remember-decide-phase__intro">
                <p className="remember-decide-eyebrow">Firefly {itemIndex + 1} of {itemCount}</p>
                <h2 id="remember-decide-location-title" ref={headingRef} tabIndex={-1}>Remember this pot</h2>
                <p className="remember-decide-phase__hint">A little light. Keep its place in mind.</p>
            </div>
            <Greenhouse>
                <div className="moth-garden-slot">
                    <MemoryGrid active={location} label={`Memory grid. Row ${location.row + 1}, column ${location.column + 1} is highlighted.`} />
                </div>
            </Greenhouse>
            <div className="moth-workbench moth-workbench--note">
                <span className="moth-workbench__label">The keeper’s routine</span>
                <p>Remember a pot. Inspect a moth. Keep the order.</p>
            </div>
        </section>
    );
}
