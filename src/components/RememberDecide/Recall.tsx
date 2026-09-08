import { useRef, type KeyboardEvent } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import { MEMORY_GRID_SIZE } from '../../model/rememberDecide';
import type { MemoryLocation } from '../../model/rememberDecide';
import Greenhouse from './Greenhouse';
import { LanternArtwork, Pot } from './art/GardenArtwork';

interface RecallProps {
    readonly generation: number;
    readonly sequenceLength: number;
    readonly recalled: readonly MemoryLocation[];
    readonly onRemember: (generation: number, row: number, column: number) => void;
    readonly onUndo: (generation: number) => void;
    readonly onClear: (generation: number) => void;
    readonly onSubmit: (generation: number) => void;
}

export default function Recall({ generation, sequenceLength, recalled, onRemember, onUndo, onClear, onSubmit }: RecallProps) {
    const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
    useMountEffect(() => {
        if (!(document.activeElement instanceof HTMLElement && document.activeElement.dataset.persistentControl)) {
            cellRefs.current[0]?.focus();
        }
    });

    const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
        const row = Math.floor(index / MEMORY_GRID_SIZE);
        const column = index % MEMORY_GRID_SIZE;
        let nextRow = row;
        let nextColumn = column;
        if (event.key === 'ArrowLeft') nextColumn = (column - 1 + MEMORY_GRID_SIZE) % MEMORY_GRID_SIZE;
        else if (event.key === 'ArrowRight') nextColumn = (column + 1) % MEMORY_GRID_SIZE;
        else if (event.key === 'ArrowUp') nextRow = (row - 1 + MEMORY_GRID_SIZE) % MEMORY_GRID_SIZE;
        else if (event.key === 'ArrowDown') nextRow = (row + 1) % MEMORY_GRID_SIZE;
        else return;
        event.preventDefault();
        cellRefs.current[nextRow * MEMORY_GRID_SIZE + nextColumn]?.focus();
    };

    return (
        <section className="remember-decide-phase remember-decide-recall" aria-labelledby="remember-decide-recall-title">
            <div className="remember-decide-phase__intro">
                <p className="remember-decide-eyebrow">Lantern round · ordered recall</p>
                <h2 id="remember-decide-recall-title">Place your lanterns in order</h2>
                <p className="remember-decide-phase__hint">Choose pots in order. Repeats are allowed. Edit before Submit.</p>
            </div>
            <Greenhouse>
                <div className="moth-garden-slot">
                    <div className="remember-decide-recall-grid" role="group" aria-label="Location recall grid. Use arrow keys to move between pots.">
                        {Array.from({ length: MEMORY_GRID_SIZE * MEMORY_GRID_SIZE }, (_, index) => {
                            const row = Math.floor(index / MEMORY_GRID_SIZE);
                            const column = index % MEMORY_GRID_SIZE;
                            const lanternCount = recalled.filter((location) => location.row === row && location.column === column).length;
                            return (
                                <button
                                    key={index}
                                    ref={(node) => { cellRefs.current[index] = node; }}
                                    type="button"
                                    className="remember-decide-recall-cell"
                                    aria-label={`Row ${row + 1}, column ${column + 1}, add as answer ${Math.min(recalled.length + 1, sequenceLength)}${lanternCount ? `. Selected ${lanternCount} ${lanternCount === 1 ? 'time' : 'times'}.` : ''}`}
                                    disabled={recalled.length >= sequenceLength}
                                    onKeyDown={(event) => moveFocus(event, index)}
                                    onClick={() => onRemember(generation, row, column)}
                                >
                                    <Pot lanternCount={lanternCount} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </Greenhouse>
            <div className="moth-workbench">
                <div className="moth-recall-caption">
                    <span className="moth-workbench__label">Your lantern order</span>
                    <span>{recalled.length} of {sequenceLength} placed</span>
                </div>
                <ol role="list" className="remember-decide-answer-strip" aria-label={`Entered locations, ${recalled.length} of ${sequenceLength}`}>
                    {recalled.map((location, index) => (
                        <li key={index}>
                            <span className="moth-answer-number">{index + 1}.</span>
                            <span className="moth-answer-lantern" aria-hidden="true"><LanternArtwork /></span>
                            <span>R{location.row + 1}C{location.column + 1}</span>
                        </li>
                    ))}
                    {Array.from({ length: sequenceLength - recalled.length }, (_, index) => (
                        <li key={`empty-${index}`} className="is-empty" aria-hidden="true"><span className="moth-answer-number">{recalled.length + index + 1}.</span><span>—</span></li>
                    ))}
                </ol>
                <div className="remember-decide-actions">
                    <button type="button" className="remember-decide-button is-secondary" onClick={() => onUndo(generation)} disabled={recalled.length === 0}>Undo</button>
                    <button type="button" className="remember-decide-button is-secondary" onClick={() => onClear(generation)} disabled={recalled.length === 0}>Clear</button>
                    <button type="button" className="remember-decide-button is-primary" onClick={() => onSubmit(generation)} disabled={recalled.length !== sequenceLength}>Submit</button>
                </div>
                <p className="moth-workbench__aside">Each tap adds a visit, even to the same pot. Edit before you submit.</p>
            </div>
        </section>
    );
}
