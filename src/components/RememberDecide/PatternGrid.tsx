import { PATTERN_GRID_SIZE } from '../../model/rememberDecide';
import type { SymmetryPattern } from '../../model/rememberDecide';

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

/** The stimulus, not illustration. Never reshape, mirror, reorder, or animate these cells. */
export function PatternGrid({ pattern, label, compact = false }: PatternGridProps) {
    return (
        <div
            className={`remember-decide-pattern${compact ? ' is-compact' : ''}`}
            role="img"
            aria-label={label ? `${label} ${describePattern(pattern)}` : describePattern(pattern)}
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
