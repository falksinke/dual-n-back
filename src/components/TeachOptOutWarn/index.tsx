import { useEffect, useState } from 'react';
import './TeachOptOutWarn.scss';

interface TeachOptOutWarnProps {
    onKeepPracticing: () => void;
    onConfirm: () => void;
}

const EXIT_MS = 220;

const TeachOptOutWarn = ({ onKeepPracticing, onConfirm }: TeachOptOutWarnProps) => {
    const [leaving, setLeaving] = useState(false);
    const [action, setAction] = useState<'keep' | 'confirm' | null>(null);

    useEffect(() => {
        if (!leaving || action == null) return;
        const id = window.setTimeout(() => {
            if (action === 'keep') onKeepPracticing();
            else onConfirm();
        }, EXIT_MS);
        return () => window.clearTimeout(id);
    }, [leaving, action, onKeepPracticing, onConfirm]);

    const leave = (next: 'keep' | 'confirm') => {
        if (leaving) return;
        setAction(next);
        setLeaving(true);
    };

    return (
        <div
            className={`teach-opt-out-warn${leaving ? ' is-leaving' : ''}`}
            role="dialog"
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
