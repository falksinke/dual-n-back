import type { SymmetryPattern } from '../../model/rememberDecide';
import { PatternGrid } from './PatternGrid';
import { MothFrameArtwork } from './art/MothArtwork';

interface MothSpecimenProps {
    readonly pattern: SymmetryPattern;
    readonly compact?: boolean;
    /** Only setup's fixed example and submitted reviews supply a contextual label. */
    readonly label?: string;
}

export default function MothSpecimen({ pattern, compact = false, label }: MothSpecimenProps) {
    return (
        <div className={`moth-specimen${compact ? ' is-compact' : ''}`}>
            <MothFrameArtwork />
            <PatternGrid pattern={pattern} compact={compact} label={label} />
        </div>
    );
}
