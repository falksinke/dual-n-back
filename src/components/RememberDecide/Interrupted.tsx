import { useRef } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import Greenhouse from './Greenhouse';

interface InterruptedProps {
    readonly status: string;
    readonly onRestart: () => void;
    readonly onSetup: () => void;
    readonly onExit: () => void;
}

export default function Interrupted({ status, onRestart, onSetup, onExit }: InterruptedProps) {
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    useMountEffect(() => headingRef.current?.focus());
    return (
        <section className="remember-decide-interrupted" aria-labelledby="remember-decide-interrupted-title">
            <div className="moth-interrupted-scene"><Greenhouse /></div>
            <div className="moth-interrupted-note">
                <p className="remember-decide-eyebrow">The greenhouse can wait</p>
                <h2 id="remember-decide-interrupted-title" ref={headingRef} tabIndex={-1}>Round interrupted</h2>
                <p>This entire attempt was discarded, with no result. There is nothing to resume.</p>
                <p>Restarting creates a fresh round at the same settings. Your keeper will be here.</p>
                <div className="remember-decide-actions">
                    <button type="button" className="remember-decide-button is-primary" onClick={onRestart}>Restart round</button>
                    <button type="button" className="remember-decide-button is-secondary" onClick={onSetup}>Settings</button>
                    <button type="button" className="remember-decide-button is-secondary" onClick={onExit}>Exit</button>
                </div>
                <p className="remember-decide-live-status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
            </div>
        </section>
    );
}
