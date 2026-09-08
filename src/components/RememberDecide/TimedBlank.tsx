import { useRef } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import type { TimedPhase } from './controller';
import Greenhouse from './Greenhouse';

interface TimedBlankProps {
    readonly phase: Extract<TimedPhase, 'location-blank' | 'decision-blank'>;
    readonly status: string;
    readonly onMounted: () => void;
}

/** No task material or previous response enters the neutral 250 ms transition. */
export default function TimedBlank({ phase, status, onMounted }: TimedBlankProps) {
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    useMountEffect(() => {
        onMounted();
        if (!(document.activeElement instanceof HTMLElement && document.activeElement.dataset.persistentControl)) {
            headingRef.current?.focus();
        }
    });
    return (
        <section className="remember-decide-phase remember-decide-blank" aria-labelledby="remember-decide-blank-title">
            <div className="remember-decide-phase__intro">
                <p className="remember-decide-eyebrow">Between visits</p>
                <h2 id="remember-decide-blank-title" ref={headingRef} tabIndex={-1}>
                    {phase === 'location-blank' ? 'To the inspection lamp' : 'A quiet moment'}
                </h2>
                <p className="remember-decide-phase__hint">{status}</p>
            </div>
            <Greenhouse />
            <div className="moth-workbench moth-workbench--note">
                <span className="moth-workbench__label">The greenhouse is still</span>
                <p>The next step will appear here.</p>
            </div>
        </section>
    );
}
