import {
    describeAccessibleAtomicOperation,
    describeAtomicOperation,
} from '../../model/swapping';
import type { SwappingRound, SwappingScore } from '../../model/swapping/types';
import Board from './Board';

export interface ResultProps {
    round: SwappingRound;
    score: SwappingScore;
    onNewRound: () => void;
    onSetup: () => void;
}

const formatLabel = (value: string): string =>
    value
        .split('-')
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(' ');

const formatArrangement = (layout: SwappingRound['config']['layout']): string =>
    layout === 'sequence' ? 'Sequence' : layout.replace('x', ' × ');

export default function Result({ round, score, onNewRound, onSetup }: ResultProps) {
    let stateIndex = 1;

    return (
        <section className="swapping-result" aria-labelledby="swapping-result-title">
            <header className={`swapping-result__summary ${score.exact ? 'is-correct' : 'is-incorrect'}`}>
                <p className="swapping-eyebrow">Round complete</p>
                <h2 id="swapping-result-title">
                    {score.exact ? 'Exactly right' : 'Keep the positions in view'}
                </h2>
                <strong>
                    {score.correctlyPlaced} of {score.total} positions correct
                </strong>
            </header>

            <dl className="swapping-result__config" aria-label="Round settings">
                <div>
                    <dt>Content</dt>
                    <dd>{formatLabel(round.config.content)}</dd>
                </div>
                <div>
                    <dt>Arrangement</dt>
                    <dd>
                        {formatArrangement(round.config.layout)} · {round.config.length} items
                    </dd>
                </div>
                <div>
                    <dt>Pattern</dt>
                    <dd>{formatLabel(round.config.pattern)}</dd>
                </div>
                <div>
                    <dt>Tier</dt>
                    <dd>{formatLabel(round.config.tier)}</dd>
                </div>
                <div>
                    <dt>Operations</dt>
                    <dd>{round.config.operationCount}</dd>
                </div>
            </dl>

            <div className="swapping-result__boards">
                <section>
                    <h2>Your answer</h2>
                    <Board config={round.config} tokens={score.submitted} ariaLabel="Your submitted arrangement" />
                </section>
                <section>
                    <h2>Correct answer</h2>
                    <Board config={round.config} tokens={score.correct} ariaLabel="Correct arrangement" />
                </section>
            </div>

            <details className="swapping-solution">
                <summary>Show step-by-step solution</summary>
                <div className="swapping-solution__initial">
                    <h2>Starting arrangement</h2>
                    <Board config={round.config} tokens={round.initial} ariaLabel="Starting arrangement" />
                </div>
                <ol className="swapping-solution__steps">
                    {round.cards.flatMap((card, cardIndex) =>
                        card.operations.map((operation, operationIndex) => {
                            const state = round.states[stateIndex++];
                            const visibleDescription = describeAtomicOperation(
                                operation,
                                round.config.layout
                            );
                            const accessibleDescription = describeAccessibleAtomicOperation(
                                operation,
                                round.config.layout
                            );
                            return (
                                <li key={`${cardIndex}-${operationIndex}`}>
                                    <h3 aria-label={accessibleDescription}>
                                        <span aria-hidden="true">{visibleDescription}</span>
                                    </h3>
                                    {card.operations.length === 2 && (
                                        <p>
                                            Card {cardIndex + 1}, step {operationIndex + 1}
                                        </p>
                                    )}
                                    <Board
                                        config={round.config}
                                        tokens={state}
                                        ariaLabel={`Arrangement after ${accessibleDescription.toLowerCase()}`}
                                    />
                                </li>
                            );
                        })
                    )}
                </ol>
            </details>

            <div className="swapping-controls">
                <button type="button" className="swapping-button is-primary" onClick={onNewRound}>
                    New round
                </button>
                <button type="button" className="swapping-button is-secondary" onClick={onSetup}>
                    Change setup
                </button>
            </div>
        </section>
    );
}
