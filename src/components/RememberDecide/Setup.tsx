import { useRef } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import {
    JUDGEMENT_DEADLINES_MS,
    MAX_SEQUENCE_LENGTH,
    MIN_SEQUENCE_LENGTH,
} from '../../model/rememberDecide';
import type { RememberDecideConfig, SymmetryDifficulty } from '../../model/rememberDecide';
import { MemoryGrid } from './Location';
import { PatternGrid } from './SymmetryDecision';

const EXAMPLE_PATTERN = {
    cells: [
        false, true, false, false, true, false,
        true, true, false, false, true, true,
        false, false, true, true, false, false,
        true, false, true, true, false, true,
        false, true, true, true, true, false,
        true, false, false, false, false, true,
    ],
};

interface SetupProps {
    readonly config: RememberDecideConfig;
    readonly error: string | null;
    readonly onChange: (config: RememberDecideConfig) => void;
    readonly onStart: () => void;
}
export default function Setup({ config, error, onChange, onStart }: SetupProps) {
    const headingRef = useRef<HTMLHeadingElement | null>(null);
    useMountEffect(() => headingRef.current?.focus());
    const update = (patch: Partial<RememberDecideConfig>): void => onChange({ ...config, ...patch });

    return (
        <section className="remember-decide-setup" aria-labelledby="remember-decide-setup-title">
            <header className="remember-decide-heading">
                <p className="remember-decide-eyebrow">Spatial complex span</p>
                <h2 id="remember-decide-setup-title" ref={headingRef} tabIndex={-1}>Remember &amp; Decide</h2>
                <p>
                    Remember one location, judge one pattern, and repeat. After the final pattern,
                    enter every location in order.
                </p>
            </header>

            <section className="remember-decide-panel" aria-labelledby="remember-decide-settings-title">
                <h3 id="remember-decide-settings-title">Round settings</h3>
                <div className="remember-decide-form-grid">
                    <label className="remember-decide-field">
                        <span>Sequence length</span>
                        <select value={config.sequenceLength} onChange={(event) => update({ sequenceLength: Number(event.target.value) })}>
                            {Array.from(
                                { length: MAX_SEQUENCE_LENGTH - MIN_SEQUENCE_LENGTH + 1 },
                                (_, index) => MIN_SEQUENCE_LENGTH + index
                            ).map((length) => <option key={length} value={length}>{length}</option>)}
                        </select>
                    </label>
                    <label className="remember-decide-field">
                        <span>Symmetry difficulty</span>
                        <select value={config.symmetryDifficulty} onChange={(event) => update({ symmetryDifficulty: event.target.value as SymmetryDifficulty })}>
                            <option value="more">More differences</option>
                            <option value="some">Some differences</option>
                            <option value="fewer">Fewer differences</option>
                        </select>
                        <small>Controls how closely a non-symmetrical figure resembles its mirror.</small>
                    </label>
                    <label className="remember-decide-field">
                        <span>Judgement deadline</span>
                        <select value={config.judgementDeadlineMs} onChange={(event) => update({ judgementDeadlineMs: Number(event.target.value) as RememberDecideConfig['judgementDeadlineMs'] })}>
                            {JUDGEMENT_DEADLINES_MS.map((deadline) => (
                                <option key={deadline} value={deadline}>{deadline / 1000} seconds</option>
                            ))}
                        </select>
                    </label>
                </div>
                <p className="remember-decide-policy">
                    Pausing or hiding this page discards the current attempt. Restarting creates a fresh round with the same settings.
                </p>
                {error && <p className="remember-decide-error" role="alert">{error}</p>}
                <button type="button" className="remember-decide-button is-primary remember-decide-start" onClick={onStart}>
                    Start round
                </button>
            </section>

            <section className="remember-decide-panel remember-decide-example" aria-labelledby="remember-decide-example-title">
                <div>
                    <p className="remember-decide-eyebrow">Example · not scored</p>
                    <h3 id="remember-decide-example-title">Remember, then decide</h3>
                    <p>First remember the highlighted location. Then decide whether the sample pattern is vertically symmetrical.</p>
                </div>
                <div className="remember-decide-example__grids">
                    <MemoryGrid active={{ row: 1, column: 2 }} label="Example memory grid. Row 2, column 3 is highlighted." compact />
                    <PatternGrid pattern={EXAMPLE_PATTERN} label="Example pattern. This labelled example is vertically symmetrical." compact />
                </div>
                <p><strong>Example answer:</strong> Yes. During a scored round, correctness stays hidden until the result.</p>
            </section>
        </section>
    );
}
