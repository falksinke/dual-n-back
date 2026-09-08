import { useRef } from 'react';
import { useMountEffect } from '../../hooks/useMountEffect';
import { JUDGEMENT_DEADLINES_MS, MAX_SEQUENCE_LENGTH, MIN_SEQUENCE_LENGTH } from '../../model/rememberDecide';
import type { RememberDecideConfig, SymmetryDifficulty } from '../../model/rememberDecide';
import Greenhouse from './Greenhouse';
import { MemoryGrid } from './Location';
import MothSpecimen from './MothSpecimen';

// The original fixed, unscored example. It never enters the round generator or scoring.
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
                <p className="remember-decide-eyebrow">The night greenhouse · spatial complex span</p>
                <h2 id="remember-decide-setup-title" ref={headingRef} tabIndex={-1}>The night shift is yours.</h2>
                <p>Remember the firefly’s landing places while inspecting moths at the lamp. When the last moth leaves, light the pots in the order you remember.</p>
            </header>
            <div className="moth-setup-layout">
                <div className="moth-welcome-garden">
                    <Greenhouse welcome>
                        <div className="moth-garden-slot"><MemoryGrid label="The greenhouse: sixteen plant pots in four rows and four columns. No landing is shown." /></div>
                    </Greenhouse>
                    <div className="moth-workbench moth-workbench--note">
                        <span className="moth-workbench__label">A note from your keeper</span>
                        <p>“Watch the light. Inspect the markings. Leave the lanterns until the end.”</p>
                    </div>
                    <ol role="list" className="moth-routine" aria-label="How a round works">
                        <li><span aria-hidden="true">01</span><div><strong>Remember</strong><p>A firefly lands for one second.</p></div></li>
                        <li><span aria-hidden="true">02</span><div><strong>Inspect</strong><p>Are the moth’s square markings mirrored left to right? Repeat after every landing.</p></div></li>
                        <li><span aria-hidden="true">03</span><div><strong>Light the way</strong><p>After the final inspection, choose pots in order. Revise, then submit.</p></div></li>
                    </ol>
                </div>
                <section className="moth-fieldbook" aria-labelledby="remember-decide-settings-title">
                    <header className="moth-fieldbook__heading">
                        <p className="remember-decide-eyebrow">Keeper’s notebook</p>
                        <h3 id="remember-decide-settings-title">Tonight’s round</h3>
                    </header>
                    <div className="remember-decide-form-grid">
                        <label className="remember-decide-field">
                            <span>Sequence length</span>
                            <select value={config.sequenceLength} onChange={(event) => update({ sequenceLength: Number(event.target.value) })}>
                                {Array.from({ length: MAX_SEQUENCE_LENGTH - MIN_SEQUENCE_LENGTH + 1 }, (_, index) => MIN_SEQUENCE_LENGTH + index)
                                    .map((length) => <option key={length} value={length}>{length}</option>)}
                            </select>
                            <small>Remember this many landings, with one moth after each.</small>
                        </label>
                        <label className="remember-decide-field">
                            <span>Pattern differences</span>
                            <select value={config.symmetryDifficulty} onChange={(event) => update({ symmetryDifficulty: event.target.value as SymmetryDifficulty })}>
                                <option value="more">More differences</option>
                                <option value="some">Some differences</option>
                                <option value="fewer">Fewer differences</option>
                            </select>
                            <small>How closely non-symmetrical markings resemble their mirror. These are difference settings, not calibrated difficulty levels.</small>
                        </label>
                        <label className="remember-decide-field">
                            <span>Judgement deadline</span>
                            <select value={config.judgementDeadlineMs} onChange={(event) => update({ judgementDeadlineMs: Number(event.target.value) as RememberDecideConfig['judgementDeadlineMs'] })}>
                                {JUDGEMENT_DEADLINES_MS.map((deadline) => <option key={deadline} value={deadline}>{deadline / 1000} seconds</option>)}
                            </select>
                        </label>
                    </div>
                    <p className="remember-decide-policy">Pause or hide this page and the whole attempt is discarded, not saved. Restart creates a fresh round with the same settings.</p>
                    {error && <p className="remember-decide-error" role="alert">{error}</p>}
                    <button type="button" className="remember-decide-button is-primary remember-decide-start" onClick={onStart}>Start round</button>
                    <p className="moth-fieldbook__footnote">Settings stay fixed during a round. Recall and inspections are scored separately, after Submit.</p>
                </section>
            </div>
            <section className="moth-example" aria-labelledby="remember-decide-example-title">
                <div className="moth-example__copy">
                    <p className="remember-decide-eyebrow">Example · not scored</p>
                    <h3 id="remember-decide-example-title">One landing, one inspection.</h3>
                    <p>First remember the highlighted pot: row 2, column 3. Then judge only the square markings, not the decorative wings.</p>
                    <p><strong>Example answer: Yes.</strong> The left and right halves match. In a scored round, all feedback waits until you submit your lantern order.</p>
                </div>
                <div className="remember-decide-example__grids">
                    <figure>
                        <MemoryGrid active={{ row: 1, column: 2 }} label="Example memory grid. Row 2, column 3 is highlighted." compact />
                        <figcaption>Remember R2C3</figcaption>
                    </figure>
                    <figure>
                        <MothSpecimen pattern={EXAMPLE_PATTERN} label="Example pattern. This labelled example is vertically symmetrical." compact />
                        <figcaption>Inspect the markings</figcaption>
                    </figure>
                </div>
            </section>
        </section>
    );
}
