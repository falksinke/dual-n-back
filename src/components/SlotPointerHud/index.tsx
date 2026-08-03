import { useEffect, useState } from 'react';
import type { PointerMode } from '../../model/adaptiveCurriculum';
import './SlotPointerHud.scss';

interface SlotPointerHudProps {
    n: number;
    /** 0-based trial index within the block (after warmup still advances pointer). */
    trialIndex: number;
    pointerMode: PointerMode;
    stimulusEpoch: number;
}

type OpFlash = 'COMPARE' | 'REPLACE' | 'NEXT' | null;

const SlotPointerHud = ({ n, trialIndex, pointerMode, stimulusEpoch }: SlotPointerHudProps) => {
    const [op, setOp] = useState<OpFlash>(null);
    const slots = Math.max(1, Math.floor(n));
    const active = ((Math.max(0, trialIndex) % slots) + slots) % slots;

    useEffect(() => {
        if (pointerMode === 'off' || stimulusEpoch <= 0) {
            setOp(null);
            return;
        }
        setOp('COMPARE');
        const t1 = window.setTimeout(() => setOp('REPLACE'), 280);
        const t2 = window.setTimeout(() => setOp('NEXT'), 560);
        const t3 = window.setTimeout(() => setOp(null), 900);
        return () => {
            window.clearTimeout(t1);
            window.clearTimeout(t2);
            window.clearTimeout(t3);
        };
    }, [stimulusEpoch, pointerMode]);

    if (pointerMode === 'off') return null;

    return (
        <div
            className={`slot-pointer-hud${pointerMode === 'fade' ? ' is-fade' : ''}`}
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Active slot ${active + 1} of ${slots}`}
        >
            <div className="slot-pointer-hud__slots">
                {Array.from({ length: slots }, (_, i) => (
                    <span key={i} className="slot-pointer-hud__slot-wrap">
                        {i > 0 && <span className="slot-pointer-hud__arrow">→</span>}
                        <span className={`slot-pointer-hud__slot${i === active ? ' is-active' : ''}`}>
                            {i + 1}
                        </span>
                    </span>
                ))}
            </div>
            {op != null && (
                <div key={`${stimulusEpoch}-${op}`} className="slot-pointer-hud__op">
                    {op} SLOT {active + 1}
                </div>
            )}
        </div>
    );
};

export default SlotPointerHud;
