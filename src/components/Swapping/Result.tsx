import { describeAccessibleAtomicOperation, describeAtomicOperation, sameTokenIdentity } from '../../model/swapping';
import type { SwappingRound, SwappingScore } from '../../model/swapping/types';
import Board from './Board';
import RailwayScene from './RailwayScene';

export interface ResultProps {
    round: SwappingRound;
    score: SwappingScore;
    onNewRound: () => void;
    onSetup: () => void;
}

const formatLabel = (value: string): string => {
    if (value === 'icons') return 'Shapes';
    if (value === 'audio') return 'Spoken letters';
    return value.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
};
const formatArrangement = (layout: SwappingRound['config']['layout']): string =>
    layout === 'sequence' ? 'Sequence' : layout.replace('x', ' × ');

export default function Result({ round, score, onNewRound, onSetup }: ResultProps) {
    let stateIndex = 1;
    // This is result decoration, not another scorer. The controller's score remains
    // authoritative; even decorative per-bay checks use the domain's identity rule.
    const placementFeedback = score.correct.map((token, index) => {
        const submitted = score.submitted[index];
        return submitted != null && sameTokenIdentity(token, submitted);
    });

    return (
        <section className="swapping-result" aria-labelledby="swapping-result-title">
            <header className={`swapping-result__summary ${score.exact ? 'is-correct' : 'is-incorrect'}`}>
                <span className="swapping-result__stamp" aria-hidden="true">{score.exact ? '✓' : '↺'}</span>
                <div>
                    <p className="swapping-eyebrow">Round complete</p>
                    <h2 id="swapping-result-title">{score.exact ? 'Exactly right. Clear to depart.' : 'Let’s check the manifest.'}</h2>
                    <strong>{score.correctlyPlaced} of {score.total} positions correct</strong>
                    <p>{score.exact ? 'Every mark is in its bay. A good night’s work.' : 'Your placements are kept below, beside the correct arrangement. No need to rush the review.'}</p>
                </div>
            </header>

            <div className="swapping-controls swapping-controls--result">
                <button type="button" className="swapping-button is-primary" autoFocus onClick={onNewRound}>New round</button>
                <button type="button" className="swapping-button is-secondary" onClick={onSetup}>Change setup</button>
            </div>

            <RailwayScene mood={score.exact ? 'success' : 'review'}
                message={score.exact ? 'All aboard. The stationmaster can finally put the kettle on.' : 'The cat has opened one eye. Let’s compare the numbered bays.'}>
                <div className="swapping-result__boards">
                    <section>
                        <h3>Your answer <span>Submitted manifest</span></h3>
                        <Board config={round.config} tokens={score.submitted} feedback={placementFeedback} ariaLabel="Your submitted arrangement" />
                    </section>
                    <section>
                        <h3>Correct answer <span>Unloading manifest</span></h3>
                        <Board config={round.config} tokens={score.correct} ariaLabel="Correct arrangement" />
                    </section>
                </div>
                <p className="swapping-result__legend">✓ Correct bay · × Check against the correct manifest. Identical marks count as the same cargo.</p>
            </RailwayScene>

            <dl className="swapping-result__config" aria-label="Round settings">
                <div><dt>Content</dt><dd>{formatLabel(round.config.content)}</dd></div>
                <div><dt>Arrangement</dt><dd>{formatArrangement(round.config.layout)} · {round.config.length} items</dd></div>
                <div><dt>Pattern</dt><dd>{formatLabel(round.config.pattern)}</dd></div>
                <div><dt>Tier</dt><dd>{formatLabel(round.config.tier)}</dd></div>
                <div><dt>Operations</dt><dd>{round.config.operationCount}</dd></div>
            </dl>

            <details className="swapping-solution">
                <summary>Show step-by-step solution</summary>
                <p className="swapping-solution__intro">Dispatch log · one arrangement after each individual operation, in its original order.</p>
                <div className="swapping-solution__initial">
                    <h2>Starting arrangement</h2>
                    <Board config={round.config} tokens={round.initial} ariaLabel="Starting arrangement" />
                </div>
                <ol className="swapping-solution__steps">
                    {round.cards.flatMap((card, cardIndex) =>
                        card.operations.map((operation, operationIndex) => {
                            const state = round.states[stateIndex++];
                            const visibleDescription = describeAtomicOperation(operation, round.config.layout);
                            const accessibleDescription = describeAccessibleAtomicOperation(operation, round.config.layout);
                            return (
                                <li key={`${cardIndex}-${operationIndex}`}>
                                    <h3 aria-label={accessibleDescription}><span aria-hidden="true">{visibleDescription}</span></h3>
                                    {card.operations.length === 2 && <p>Card {cardIndex + 1}, step {operationIndex + 1}</p>}
                                    <Board config={round.config} tokens={state}
                                        ariaLabel={`Arrangement after ${accessibleDescription.toLowerCase()}`} />
                                </li>
                            );
                        })
                    )}
                </ol>
            </details>
        </section>
    );
}
