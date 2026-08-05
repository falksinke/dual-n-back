import { useEffect, useState, type ReactNode } from 'react';
import type { PointerMode } from '../../model/adaptiveCurriculum';
import type { TeachOpStep } from '../../store/gameStore';
import './SlotPointerHud.scss';

interface SlotPointerHudProps {
    n: number;
    /** 0-based trial index within the block (after warmup still advances pointer). */
    trialIndex: number;
    pointerMode: PointerMode;
    stimulusEpoch: number;
    /** Learner-paced teach: no auto op flash; show Continue. */
    paced?: boolean;
    opStep?: TeachOpStep | null;
    onAdvanceOp?: () => void;
    onRetreatOp?: () => void;
    revealPositionIndex?: number | null;
    revealLetter?: string | null;
    /** Current trial letter/token (for replace-this-with-this copy). */
    currentLetter?: string | null;
    /** Current trial board cell, 0-based. */
    currentPositionIndex?: number | null;
    /** Shown beside Continue in a horizontal actions row (e.g. I've got it). */
    trailingAction?: ReactNode;
}

type OpFlash = TeachOpStep | null;

function buildOpMessage(args: {
    op: Exclude<TeachOpStep, 'NEXT'>;
    slot: number;
    revealLetter: string | null;
    currentLetter: string | null;
    revealPositionIndex: number | null;
    currentPositionIndex: number | null;
}): string {
    const { op, slot, revealLetter, currentLetter, revealPositionIndex, currentPositionIndex } =
        args;
    if (op === 'COMPARE') {
        const parts: string[] = [`Compare slot ${slot}`];
        if (revealLetter && currentLetter) {
            parts.push(`remembered ${revealLetter} vs now ${currentLetter}`);
        } else if (revealPositionIndex != null && currentPositionIndex != null) {
            parts.push(`cell ${revealPositionIndex + 1} vs cell ${currentPositionIndex + 1}`);
        }
        return parts.join(' — ');
    }
    if (revealLetter && currentLetter) {
        return `Replace slot ${slot}: ${revealLetter} → ${currentLetter}`;
    }
    if (revealPositionIndex != null && currentPositionIndex != null) {
        return `Replace slot ${slot}: cell ${revealPositionIndex + 1} → cell ${currentPositionIndex + 1}`;
    }
    return `Replace slot ${slot} with what you see now`;
}

const SlotPointerHud = ({
    n,
    trialIndex,
    pointerMode,
    stimulusEpoch,
    paced = false,
    opStep = null,
    onAdvanceOp,
    onRetreatOp,
    revealPositionIndex = null,
    revealLetter = null,
    currentLetter = null,
    currentPositionIndex = null,
    trailingAction = null,
}: SlotPointerHudProps) => {
    const [autoOp, setAutoOp] = useState<OpFlash>(null);
    const slots = Math.max(1, Math.floor(n));
    const active = ((Math.max(0, trialIndex) % slots) + slots) % slots;
    const isFill = paced && opStep == null && trialIndex < slots;

    useEffect(() => {
        if (paced || pointerMode === 'off' || stimulusEpoch <= 0) {
            setAutoOp(null);
            return;
        }
        setAutoOp('COMPARE');
        const t1 = window.setTimeout(() => setAutoOp('REPLACE'), 280);
        const t2 = window.setTimeout(() => setAutoOp('NEXT'), 560);
        const t3 = window.setTimeout(() => setAutoOp(null), 900);
        return () => {
            window.clearTimeout(t1);
            window.clearTimeout(t2);
            window.clearTimeout(t3);
        };
    }, [stimulusEpoch, pointerMode, paced]);

    if (pointerMode === 'off') return null;

    const displayedOp = paced ? opStep : autoOp;
    const nextSlot = ((active + 1) % slots) + 1;
    const opMessage =
        displayedOp == null
            ? null
            : displayedOp === 'NEXT'
              ? `Next — move to slot ${nextSlot}`
              : buildOpMessage({
                    op: displayedOp,
                    slot: active + 1,
                    revealLetter,
                    currentLetter,
                    revealPositionIndex,
                    currentPositionIndex,
                });

    const revealNote =
        revealPositionIndex != null && revealPositionIndex >= 0
            ? ` · remembered position ${revealPositionIndex + 1}`
            : '';
    const ariaLabel = isFill
        ? `Fill slot ${active + 1} of ${slots}`
        : `Active slot ${active + 1} of ${slots}${revealNote}`;

    return (
        <div
            className={`slot-pointer-hud${pointerMode === 'fade' ? ' is-fade' : ''}${paced ? ' is-paced' : ''}`}
            aria-live="polite"
            aria-atomic="true"
            aria-label={ariaLabel}
        >
            <div className="slot-pointer-hud__slots">
                {Array.from({ length: slots }, (_, i) => (
                    <span key={i} className="slot-pointer-hud__slot-wrap">
                        {i > 0 && <span className="slot-pointer-hud__arrow">→</span>}
                        <span
                            className={[
                                'slot-pointer-hud__slot',
                                i === active ? 'is-active' : '',
                                i === active && displayedOp === 'REPLACE' ? 'is-replace' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            {i + 1}
                        </span>
                    </span>
                ))}
            </div>
            {isFill && (
                <div className="slot-pointer-hud__op">
                    Fill slot {active + 1} — remember this
                </div>
            )}
            {!isFill && revealLetter != null && revealLetter !== '' && (
                <div
                    className="slot-pointer-hud__reveal-letter"
                    aria-label={`Remembered letter ${revealLetter}`}
                >
                    {revealLetter}
                    {currentLetter != null && currentLetter !== '' && displayedOp === 'REPLACE'
                        ? ` → ${currentLetter}`
                        : ''}
                </div>
            )}
            {!isFill && opMessage != null && (
                <div key={`${stimulusEpoch}-${displayedOp}`} className="slot-pointer-hud__op">
                    {opMessage}
                </div>
            )}
            {((paced && onAdvanceOp != null && opStep != null) || trailingAction != null) && (
                <div className="slot-pointer-hud__actions">
                    {paced && onAdvanceOp != null && opStep != null && (
                        <>
                            <button
                                type="button"
                                className="slot-pointer-hud__back"
                                onClick={onRetreatOp}
                                disabled={opStep === 'COMPARE' || onRetreatOp == null}
                            >
                                Back
                            </button>
                            <button
                                type="button"
                                className="slot-pointer-hud__continue"
                                onClick={onAdvanceOp}
                            >
                                Continue
                            </button>
                        </>
                    )}
                    {trailingAction}
                </div>
            )}
        </div>
    );
};

export default SlotPointerHud;
