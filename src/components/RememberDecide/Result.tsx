import { useRef } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import type { DecisionAnswer, RememberDecideRound, RememberDecideScore } from '../../model/rememberDecide';
import Greenhouse from './Greenhouse';
import { MemoryGrid } from './Location';
import MothSpecimen from './MothSpecimen';

interface ResultProps {
    readonly round: RememberDecideRound;
    readonly score: RememberDecideScore;
    readonly onNewRound: () => void;
    readonly onTryNextLength: () => void;
    readonly onSetup: () => void;
    readonly onExit: () => void;
}

function answerLabel(answer: DecisionAnswer | null): string {
    if (answer == null) return 'No answer';
    return answer === 'yes' ? 'Yes' : 'No';
}

export default function Result({ round, score, onNewRound, onTryNextLength, onSetup, onExit }: ResultProps) {
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    useMountEffect(() => headingRef.current?.focus());
    const truthClasses = new Set(round.items.map((item) => item.isSymmetric));
    const allOneTruthClass = truthClasses.size < 2;

    return (
        <section className="remember-decide-result" aria-labelledby="remember-decide-result-title">
            <div className="moth-result-opening">
                <div className="moth-result-garden">
                    <Greenhouse>
                        <div className="moth-garden-slot"><MemoryGrid submitted={score.recalled} label="Your submitted lanterns. The full position-by-position comparison follows below." /></div>
                    </Greenhouse>
                    <p>Your submitted lanterns</p>
                </div>
                <header className="remember-decide-result__summary">
                    <p className="remember-decide-eyebrow">Round complete · the keeper’s record</p>
                    <h2 id="remember-decide-result-title" ref={headingRef} tabIndex={-1}>{score.exactSequence ? 'Lanterns in place.' : 'A night to look back on.'}</h2>
                    <p>The firefly route and your moth inspections tell two separate stories.</p>
                    <div className="moth-score-chapters">
                        <section aria-labelledby="moth-recall-score-title">
                            <h3 id="moth-recall-score-title">Firefly locations</h3>
                            <div className="remember-decide-score-grid">
                                <p><strong>{score.correctlyRecalled}/{score.recallTotal}</strong><span>positions correct</span></p>
                                <p><strong>{score.exactSequence ? 'Yes' : 'No'}</strong><span>exact sequence</span></p>
                            </div>
                        </section>
                        <section aria-labelledby="moth-inspection-score-title">
                            <h3 id="moth-inspection-score-title">Moth inspections</h3>
                            <div className="remember-decide-score-grid">
                                <p><strong>{score.correctJudgements}/{score.judgementTotal}</strong><span>decisions correct</span></p>
                                <p><strong>{score.timeoutCount}</strong><span>timeouts</span></p>
                            </div>
                        </section>
                    </div>
                    {allOneTruthClass && <p className="remember-decide-result__message">Try another round to answer both pattern types.</p>}
                    {score.recommendation.reason === 'maximum-length' && <p className="remember-decide-result__message">You completed the maximum sequence length.</p>}
                    {score.recommendation.canIncrease && <p className="remember-decide-result__message">Room for one more lantern? You can try {score.recommendation.nextLength} locations with the same inspection settings.</p>}
                </header>
            </div>
            <div className="remember-decide-actions moth-result-actions">
                {score.recommendation.canIncrease && <button type="button" className="remember-decide-button is-primary" onClick={onTryNextLength}>Try next length</button>}
                <button type="button" className="remember-decide-button is-secondary" onClick={onNewRound}>New round</button>
                <button type="button" className="remember-decide-button is-secondary" onClick={onSetup}>Settings</button>
                <button type="button" className="remember-decide-button is-secondary" onClick={onExit}>Exit</button>
            </div>
            <section className="moth-ledger" aria-labelledby="remember-decide-memory-review-title">
                <header className="moth-ledger__heading">
                    <span className="remember-decide-eyebrow">01 · Lantern record</span>
                    <h3 id="remember-decide-memory-review-title">Location review</h3>
                    <p>Every visit in order, including repeats. A match means the same pot at the same position.</p>
                </header>
                <ol role="list" className="remember-decide-review-list">
                    {round.items.map((item, index) => {
                        const submitted = score.recalled[index];
                        const correct = submitted?.row === item.location.row && submitted.column === item.location.column;
                        return (
                            <li key={index} className={correct ? 'is-correct' : 'is-incorrect'}>
                                <span className="moth-review-position">Position {index + 1}<strong>{correct ? '✓ Matched' : '≠ Different pot'}</strong></span>
                                <span>Your answer: <strong>{submitted ? `R${submitted.row + 1}C${submitted.column + 1}` : 'No answer'}</strong></span>
                                <span>Correct: <strong>R{item.location.row + 1}C{item.location.column + 1}</strong></span>
                            </li>
                        );
                    })}
                </ol>
            </section>
            <section className="moth-ledger" aria-labelledby="remember-decide-decision-review-title">
                <header className="moth-ledger__heading">
                    <span className="remember-decide-eyebrow">02 · Inspection record</span>
                    <h3 id="remember-decide-decision-review-title">Pattern review</h3>
                    <p>The same markings you inspected, with each answer now revealed.</p>
                </header>
                <ol role="list" className="remember-decide-pattern-review">
                    {round.items.map((item, index) => {
                        const response = score.decisions[index];
                        const timedOut = response?.timedOut || response?.answer == null;
                        const expected = item.isSymmetric ? 'yes' : 'no';
                        const correct = !timedOut && response?.answer === expected;
                        return (
                            <li key={item.index}>
                                <div className="moth-inspection-record-heading">
                                    <h4>Moth {index + 1}</h4>
                                    <span className="moth-record-outcome">{timedOut ? '— Timed out' : correct ? '✓ Matched' : '≠ Different answer'}</span>
                                </div>
                                <MothSpecimen pattern={item.pattern} compact label={`Pattern ${index + 1} review.`} />
                                <p>Correct answer: <strong>{item.isSymmetric ? 'Yes' : 'No'}</strong></p>
                                <p>Your answer: <strong>{answerLabel(response?.answer ?? null)}</strong>{response?.timedOut ? ' · Timed out' : ''}</p>
                            </li>
                        );
                    })}
                </ol>
            </section>
        </section>
    );
}
