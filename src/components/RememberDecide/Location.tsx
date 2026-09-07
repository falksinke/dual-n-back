import { useRef } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import { MEMORY_GRID_SIZE } from '../../model/rememberDecide';
import type { MemoryLocation } from '../../model/rememberDecide';

interface MemoryGridProps {
    readonly active?: MemoryLocation;
    readonly label: string;
    readonly compact?: boolean;
}

export function MemoryGrid({ active, label, compact = false }: MemoryGridProps) {
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
                return (
                    <div
                        key={index}
                        className={`remember-decide-memory-cell${isActive ? ' is-active' : ''}`}
                        aria-hidden="true"
                    >
                        {isActive && <span aria-hidden="true">●</span>}
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
                <p className="remember-decide-eyebrow">Location {itemIndex + 1} of {itemCount}</p>
                <h2 id="remember-decide-location-title" ref={headingRef} tabIndex={-1}>
                    Remember this location
                </h2>
                <p className="remember-decide-phase__hint">Keep it in mind for ordered recall.</p>
            </div>
            <MemoryGrid active={location} label={`Memory grid. Row ${location.row + 1}, column ${location.column + 1} is highlighted.`} />
        </section>
    );
}
