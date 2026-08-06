import { useCallback, useEffect, useRef, useState } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { getModalExitDelay } from '../utils/modalExit';
import './TeachOptOutWarn.scss';

interface TeachOptOutWarnProps {
    onKeepPracticing: () => void;
    onConfirm: () => void;
}

const TeachOptOutWarn = ({ onKeepPracticing, onConfirm }: TeachOptOutWarnProps) => {
    const [leaving, setLeaving] = useState(false);
    const [action, setAction] = useState<'keep' | 'confirm' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const keepRef = useRef<HTMLButtonElement>(null);

    const leave = (next: 'keep' | 'confirm') => {
        if (leaving) return;
        setAction(next);
        setLeaving(true);
    };

    const handleEscape = useCallback(() => leave('keep'), [leaving]);

    // `active` stays true through the exit animation: the keyboard gate lasts
    // the warn's full visible lifetime, and focus restores on unmount — after
    // the store update remounts the `.teach-opt-out__btn` invoker.
    useModalA11y({
        active: true,
        onEscape: handleEscape,
        initialFocusRef: keepRef,
        enableTrap: true,
        restoreTarget: '.teach-opt-out__btn',
        containerRef,
    });

    useEffect(() => {
        if (!leaving || action == null) return;
        const id = window.setTimeout(() => {
            if (action === 'keep') onKeepPracticing();
            else onConfirm();
        }, getModalExitDelay());
        return () => window.clearTimeout(id);
    }, [leaving, action, onKeepPracticing, onConfirm]);

    return (
        <div
            ref={containerRef}
            className={`teach-opt-out-warn${leaving ? ' is-leaving' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="teach-opt-out-title"
        >
            <div className="teach-opt-out-warn__panel">
                <h2 id="teach-opt-out-title" className="teach-opt-out-warn__title">
                    Keep practicing?
                </h2>
                <p className="teach-opt-out-warn__body">
                    A few more decide trials help the compare → replace → next rhythm stick. You can
                    still move on when ready.
                </p>
                <div className="teach-opt-out-warn__actions">
                    <button
                        ref={keepRef}
                        type="button"
                        className="teach-opt-out-warn__secondary"
                        onClick={() => leave('keep')}
                        disabled={leaving}
                    >
                        Keep practicing
                    </button>
                    <button
                        type="button"
                        className="teach-opt-out-warn__primary"
                        onClick={() => leave('confirm')}
                        disabled={leaving}
                    >
                        Move to speed ramp
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeachOptOutWarn;
