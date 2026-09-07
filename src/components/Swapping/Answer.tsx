import { useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import { GRID_DIMENSIONS, getAccessiblePositionLabel, getPositionLabel } from '../../model/swapping';
import type { PaletteEntry, SwappingConfig, SwappingToken } from '../../model/swapping/types';
import { SwappingTokenMark } from './Board';

export interface AnswerProps {
    config: SwappingConfig;
    slots: readonly (SwappingToken | undefined)[];
    activeIndex: number;
    palette: readonly PaletteEntry[];
    onSelect: (index: number) => void;
    onPlace: (entry: PaletteEntry) => void;
    onClear: (index: number) => void;
    onSubmit: () => void;
    onPause: () => void;
}

function nextIndex(current: number, length: number, direction: 1 | -1): number {
    return (current + direction + length) % length;
}

export default function Answer({
    config,
    slots,
    activeIndex,
    palette,
    onSelect,
    onPlace,
    onClear,
    onSubmit,
    onPause,
}: AnswerProps) {
    const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const paletteRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const submitRef = useRef<HTMLButtonElement | null>(null);
    const complete = slots.every((token) => token != null);
    const columns =
        config.layout === 'sequence'
            ? Math.min(slots.length, 6)
            : GRID_DIMENSIONS[config.layout].columns;
    const mobileColumns = config.layout === 'sequence' ? Math.min(slots.length, 4) : columns;

    useMountEffect(() => {
        slotRefs.current[activeIndex]?.focus();
    });

    const focusAfterPlace = (): void => {
        const nextEmpty = Array.from(
            { length: slots.length - 1 },
            (_, offset) => (activeIndex + offset + 1) % slots.length
        ).find((index) => slots[index] == null);

        queueMicrotask(() => {
            if (nextEmpty == null) submitRef.current?.focus();
            else slotRefs.current[nextEmpty]?.focus();
        });
    };

    const place = (entry: PaletteEntry): void => {
        if (entry.remaining === 0) return;
        onPlace(entry);
        focusAfterPlace();
    };

    const clearActive = (): void => {
        onClear(activeIndex);
        queueMicrotask(() => slotRefs.current[activeIndex]?.focus());
    };

    const moveSlotFocus = (
        event: KeyboardEvent<HTMLButtonElement>,
        index: number
    ): void => {
        const direction =
            event.key === 'ArrowRight' || event.key === 'ArrowDown'
                ? 1
                : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                  ? -1
                  : null;
        if (direction == null) return;
        event.preventDefault();
        const target = nextIndex(index, slots.length, direction);
        slotRefs.current[target]?.focus();
    };

    const movePaletteFocus = (
        event: KeyboardEvent<HTMLButtonElement>,
        index: number
    ): void => {
        const direction =
            event.key === 'ArrowRight' || event.key === 'ArrowDown'
                ? 1
                : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                  ? -1
                  : null;
        if (direction == null) return;
        event.preventDefault();
        let target = index;
        for (let checked = 0; checked < palette.length; checked++) {
            target = nextIndex(target, palette.length, direction);
            if (palette[target].remaining > 0) break;
        }
        paletteRefs.current[target]?.focus();
    };

    const handleAnswerKeys = (event: KeyboardEvent<HTMLElement>): void => {
        if (event.repeat && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            return;
        }
        if (event.key !== 'Delete' && event.key !== 'Backspace') return;
        event.preventDefault();
        if (!event.repeat) clearActive();
    };

    return (
        <section
            className="swapping-play swapping-answer"
            aria-labelledby="swapping-answer-title"
            onKeyDown={handleAnswerKeys}
        >
            <div className="swapping-play__topline">
                <span>Reconstruct the final arrangement</span>
                <button type="button" className="swapping-button is-quiet" onClick={onPause}>
                    Pause
                </button>
            </div>
            <header className="swapping-section-heading">
                <h2 id="swapping-answer-title">Place every token</h2>
                <p>Select a slot, then choose one remaining token.</p>
            </header>

            <ol
                className={`swapping-answer__slots is-${config.layout === 'sequence' ? 'sequence' : 'grid'}`}
                style={{
                    '--swapping-columns': columns,
                    '--swapping-mobile-columns': mobileColumns,
                } as CSSProperties}
                aria-label="Answer slots"
            >
                {slots.map((token, index) => {
                    const position = getAccessiblePositionLabel(index, config.layout);
                    const selected = index === activeIndex;
                    return (
                        <li key={index}>
                            <button
                                type="button"
                                className={`swapping-answer__slot${selected ? ' is-active' : ''}`}
                                aria-pressed={selected}
                                aria-label={`${position}, ${token == null ? 'empty' : token.label}${
                                    selected ? ', selected' : ''
                                }`}
                                onClick={() => onSelect(index)}
                                onKeyDown={(event) => moveSlotFocus(event, index)}
                                ref={(element) => {
                                    slotRefs.current[index] = element;
                                }}
                            >
                                <span className="swapping-answer__position" aria-hidden="true">
                                    {getPositionLabel(index, config.layout).replace('position ', '')}
                                </span>
                                {token == null ? (
                                    <span className="swapping-answer__empty" aria-hidden="true" />
                                ) : (
                                    <SwappingTokenMark token={token} />
                                )}
                            </button>
                        </li>
                    );
                })}
            </ol>

            <div className="swapping-palette" role="group" aria-label="Token palette">
                {palette.map((entry, index) => (
                    <button
                        type="button"
                        className="swapping-palette__token"
                        key={entry.key}
                        onClick={() => place(entry)}
                        onKeyDown={(event) => movePaletteFocus(event, index)}
                        disabled={entry.remaining === 0}
                        aria-label={`${entry.label}, ${entry.remaining} remaining`}
                        ref={(element) => {
                            paletteRefs.current[index] = element;
                        }}
                    >
                        <SwappingTokenMark token={entry} />
                        <span className="swapping-palette__count" aria-hidden="true">
                            ×{entry.remaining}
                        </span>
                    </button>
                ))}
            </div>

            <div className="swapping-controls">
                <button
                    type="button"
                    className="swapping-button is-secondary"
                    onClick={clearActive}
                    disabled={slots[activeIndex] == null}
                >
                    Clear selected
                </button>
                <button
                    type="button"
                    className="swapping-button is-primary"
                    onClick={onSubmit}
                    disabled={!complete}
                    ref={submitRef}
                >
                    Submit answer
                </button>
            </div>
        </section>
    );
}
