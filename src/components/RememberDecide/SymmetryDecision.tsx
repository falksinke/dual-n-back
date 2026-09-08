import { useRef } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import type { DecisionAnswer, SymmetryPattern } from '../../model/rememberDecide';
import Greenhouse from './Greenhouse';
import MothSpecimen from './MothSpecimen';

// Preserve the existing presentation export for local consumers.
export { PatternGrid } from './PatternGrid';

interface SymmetryDecisionProps {
    readonly pattern: SymmetryPattern;
    readonly itemIndex: number;
    readonly itemCount: number;
    readonly deadlineMs: number;
    readonly onMounted: () => void;
    readonly onAnswer: (answer: DecisionAnswer) => void;
}

export default function SymmetryDecision({ pattern, itemIndex, itemCount, deadlineMs, onMounted, onAnswer }: SymmetryDecisionProps) {
    const headingRef = useRef<HTMLHeadingElement | null>(null);

    useMountEffect(() => {
        onMounted();
        if (!(document.activeElement instanceof HTMLElement && document.activeElement.dataset.persistentControl)) {
            headingRef.current?.focus();
        }
    });

    return (
        <section className="remember-decide-phase" aria-labelledby="remember-decide-decision-title">
            <div className="remember-decide-phase__intro">
                <p className="remember-decide-eyebrow">Moth inspection {itemIndex + 1} of {itemCount}</p>
                <h2 id="remember-decide-decision-title" ref={headingRef} tabIndex={-1}>Is this vertically symmetrical?</h2>
                <p className="remember-decide-phase__hint">Judge the square markings. Answer within {deadlineMs / 1000} seconds.</p>
            </div>
            <Greenhouse>
                <div className="moth-inspection-slot"><MothSpecimen pattern={pattern} /></div>
            </Greenhouse>
            <div className="moth-workbench">
                <div className="remember-decide-actions moth-decision-actions" aria-label="Symmetry answer">
                    <button type="button" className="remember-decide-button is-primary" onClick={() => onAnswer('yes')}>Yes</button>
                    <button type="button" className="remember-decide-button is-secondary" onClick={() => onAnswer('no')}>No</button>
                </div>
                <p className="moth-workbench__aside">Your inspections stay in the notebook until submission.</p>
            </div>
        </section>
    );
}
