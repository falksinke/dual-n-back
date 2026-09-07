import type { KeyboardEvent } from 'react';
import {
    GRID_DIMENSIONS,
    describeAccessibleAtomicOperation,
    describeAtomicOperation,
} from '../../model/swapping';
import type {
    AtomicOperation,
    OperationCard,
    SwappingConfig,
} from '../../model/swapping/types';
import Board from './Board';

export interface InstructionProps {
    config: SwappingConfig;
    card: OperationCard;
    cardIndex: number;
    cardCount: number;
    onDone: () => void;
    onPause: () => void;
}

function operationHighlights(operation: AtomicOperation, config: SwappingConfig): number[] {
    switch (operation.type) {
        case 'swap':
            return [operation.first, operation.second];
        case 'reverse-span':
        case 'shift-span':
            return Array.from(
                { length: operation.end - operation.start + 1 },
                (_, index) => operation.start + index
            );
        case 'swap-rows': {
            if (config.layout === 'sequence') return [];
            const { columns } = GRID_DIMENSIONS[config.layout];
            return [operation.first, operation.second].flatMap((row) =>
                Array.from({ length: columns }, (_, column) => row * columns + column)
            );
        }
        case 'swap-columns': {
            if (config.layout === 'sequence') return [];
            const { rows, columns } = GRID_DIMENSIONS[config.layout];
            return [operation.first, operation.second].flatMap((column) =>
                Array.from({ length: rows }, (_, row) => row * columns + column)
            );
        }
        case 'mirror-left-right':
        case 'mirror-top-bottom':
        case 'rotate-clockwise':
            return Array.from({ length: config.length }, (_, index) => index);
    }
}

export default function Instruction({
    config,
    card,
    cardIndex,
    cardCount,
    onDone,
    onPause,
}: InstructionProps) {
    const derivedHighlights = Array.from(
        new Set(card.operations.flatMap((operation) => operationHighlights(operation, config)))
    );
    const isLast = cardIndex === cardCount - 1;

    const blockRepeatedActivation = (event: KeyboardEvent<HTMLButtonElement>): void => {
        if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
    };

    return (
        <section className="swapping-play" aria-labelledby="swapping-instruction-title">
            <div className="swapping-play__topline">
                <span>
                    Instruction {cardIndex + 1} of {cardCount}
                </span>
                <button type="button" className="swapping-button is-quiet" onClick={onPause}>
                    Pause
                </button>
            </div>

            <Board
                config={config}
                tokens={[]}
                highlights={derivedHighlights}
                ariaLabel="Empty board with affected positions highlighted"
            />

            <article className="swapping-instruction-card" aria-live="polite" aria-atomic="true">
                <p className="swapping-eyebrow">Keep every token in memory</p>
                <h2 id="swapping-instruction-title">
                    {card.operations.length === 2 ? 'Apply in this order' : 'Make this change'}
                </h2>
                <ol className={card.operations.length === 1 ? 'is-single' : undefined}>
                    {card.operations.map((operation, index) => (
                        <li
                            key={`${operation.type}-${index}`}
                            aria-label={describeAccessibleAtomicOperation(operation, config.layout)}
                        >
                            <span aria-hidden="true">
                                {describeAtomicOperation(operation, config.layout)}
                            </span>
                        </li>
                    ))}
                </ol>
            </article>

            <button
                type="button"
                className="swapping-button is-primary"
                onClick={onDone}
                onKeyDown={blockRepeatedActivation}
            >
                {isLast ? 'Reconstruct' : 'Done'}
            </button>
        </section>
    );
}
