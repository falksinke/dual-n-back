import { useRef } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import type { DecisionAnswer, RememberDecideRound, RememberDecideScore } from '../../model/rememberDecide';
import { PatternGrid } from './SymmetryDecision';

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

export default function Result({
    round,
    score,
    onNewRound,
    onTryNextLength,
    onSetup,
    onExit,
}: ResultProps) {
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    useMountEffect(() => headingRef.current?.focus());
    const truthClasses = new Set(round.items.map((item) => item.isSymmetric));
    const allOneTruthClass = truthClasses.size < 2;

    return (
        <section className="remember-decide-result" aria-labelledby="remember-decide-result-title">
            <header className="remember-decide-result__summary">
                <p className="remember-decide-eyebrow">Round complete</p>
                <h2 id="remember-decide-result-title" ref={headingRef} tabIndex={-1}>
                    {score.exactSequence ? 'Sequence recalled' : 'Review your sequence'}
                </h2>
                <div className="remember-decide-score-grid">
                    <p><strong>{score.correctlyRecalled}/{score.recallTotal}</strong><span>positions correct</span></p>
                    <p><strong>{score.exactSequence ? 'Yes' : 'No'}</strong><span>exact sequence</span></p>
                    <p><strong>{score.correctJudgements}/{score.judgementTotal}</strong><span>decisions correct</span></p>
                    <p><strong>{score.timeoutCount}</strong><span>timeouts</span></p>
                </div>
                {allOneTruthClass && (
                    <p className="remember-decide-result__message">Try another round to answer both pattern types.</p>
                )}
                {score.recommendation.reason === 'maximum-length' && (
                    <p className="remember-decide-result__message">You completed the maximum sequence length.</p>
                )}
            </header>

            <section className="remember-decide-panel" aria-labelledby="remember-decide-memory-review-title">
                <h3 id="remember-decide-memory-review-title">Location review</h3>
                <ol className="remember-decide-review-list">
                    {round.items.map((item, index) => {
                        const submitted = score.recalled[index];
                        const correct = submitted?.row === item.location.row && submitted.column === item.location.column;
                        return (
                            <li key={index} className={correct ? 'is-correct' : 'is-incorrect'}>
                                <span>Position {index + 1}</span>
                                <span>Your answer: {submitted ? `R${submitted.row + 1}C${submitted.column + 1}` : 'No answer'}</span>
                                <span>Correct: R{item.location.row + 1}C{item.location.column + 1}</span>
                            </li>
                        );
                    })}
                </ol>
            </section>

            <section className="remember-decide-panel" aria-labelledby="remember-decide-decision-review-title">
                <h3 id="remember-decide-decision-review-title">Pattern review</h3>
                <ol className="remember-decide-pattern-review">
                    {round.items.map((item, index) => {
                        const response = score.decisions[index];
                        return (
                            <li key={item.index}>
                                <h4>Pattern {index + 1}</h4>
                                <PatternGrid pattern={item.pattern} compact label={`Pattern ${index + 1} review`} />
                                <p>Correct answer: <strong>{item.isSymmetric ? 'Yes' : 'No'}</strong></p>
                                <p>Your answer: <strong>{answerLabel(response?.answer ?? null)}</strong>{response?.timedOut ? ' · Timed out' : ''}</p>
                            </li>
                        );
                    })}
                </ol>
            </section>

            <div className="remember-decide-actions">
                {score.recommendation.canIncrease && (
                    <button type="button" className="remember-decide-button is-primary" onClick={onTryNextLength}>Try next length</button>
                )}
                <button type="button" className="remember-decide-button is-secondary" onClick={onNewRound}>New round</button>
                <button type="button" className="remember-decide-button is-secondary" onClick={onSetup}>Settings</button>
                <button type="button" className="remember-decide-button is-secondary" onClick={onExit}>Exit</button>
            </div>
        </section>
    );
}
