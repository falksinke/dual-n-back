import { useRef } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import { PATTERN_GRID_SIZE } from '../../model/rememberDecide';
import type { DecisionAnswer, SymmetryPattern } from '../../model/rememberDecide';

function describePattern(pattern: SymmetryPattern): string {
    const rows = Array.from({ length: PATTERN_GRID_SIZE }, (_, row) => {
        const cells = pattern.cells.slice(row * PATTERN_GRID_SIZE, (row + 1) * PATTERN_GRID_SIZE);
        return `Row ${row + 1}: ${cells.map((filled) => filled ? 'filled' : 'empty').join(', ')}`;
    });
    return rows.join('. ');
}

interface PatternGridProps {
    readonly pattern: SymmetryPattern;
    readonly label?: string;
    readonly compact?: boolean;
}

export function PatternGrid({ pattern, label, compact = false }: PatternGridProps) {
    return (
        <div
            className={`remember-decide-pattern${compact ? ' is-compact' : ''}`}
            role="img"
            aria-label={label ?? describePattern(pattern)}
        >
            {pattern.cells.map((filled, index) => (
                <span
                    key={index}
                    className={`remember-decide-pattern__cell${filled ? ' is-filled' : ''}`}
                    aria-hidden="true"
                />
            ))}
        </div>
    );
}

interface SymmetryDecisionProps {
    readonly pattern: SymmetryPattern;
    readonly itemIndex: number;
    readonly itemCount: number;
    readonly deadlineMs: number;
    readonly onMounted: () => void;
    readonly onAnswer: (answer: DecisionAnswer) => void;
}

export default function SymmetryDecision({
    pattern,
    itemIndex,
    itemCount,
    deadlineMs,
    onMounted,
    onAnswer,
}: SymmetryDecisionProps) {
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
                <p className="remember-decide-eyebrow">Pattern {itemIndex + 1} of {itemCount}</p>
                <h2 id="remember-decide-decision-title" ref={headingRef} tabIndex={-1}>
                    Is this vertically symmetrical?
                </h2>
                <p className="remember-decide-phase__hint">Answer within {deadlineMs / 1000} seconds.</p>
            </div>
            <PatternGrid pattern={pattern} />
            <div className="remember-decide-actions" aria-label="Symmetry answer">
                <button type="button" className="remember-decide-button is-primary" onClick={() => onAnswer('yes')}>
                    Yes
                </button>
                <button type="button" className="remember-decide-button is-secondary" onClick={() => onAnswer('no')}>
                    No
                </button>
            </div>
        </section>
    );
}
