import {
    MAX_OPERATION_COUNT,
    MAX_SEQUENCE_LENGTH,
    MIN_OPERATION_COUNT,
    MIN_SEQUENCE_LENGTH,
    SWAPPING_PRESETS,
    createPresetConfig,
    getGridSize,
} from '../../model/swapping';
import type {
    GridLayout,
    OperationTier,
    StartingPattern,
    SwappingConfig,
    SwappingContent,
    SwappingLayout,
} from '../../model/swapping/types';

export interface SetupProps {
    config: SwappingConfig;
    validationError?: string;
    sampleStatus?: string;
    onChange: (next: SwappingConfig) => void;
    onStart: () => void;
    onSample: () => void;
}

const CONTENT_OPTIONS: readonly { value: SwappingContent; label: string }[] = [
    { value: 'numbers', label: 'Numbers 0–9' },
    { value: 'letters', label: 'Letters C H K L Q R S T' },
    { value: 'icons', label: 'Shapes' },
    { value: 'mixed', label: 'Mixed' },
    { value: 'audio', label: 'Spoken letters' },
];

const LAYOUT_OPTIONS: readonly { value: SwappingLayout; label: string }[] = [
    { value: 'sequence', label: 'Sequence' },
    { value: '2x2', label: '2 × 2 grid' },
    { value: '2x3', label: '2 × 3 grid' },
    { value: '3x3', label: '3 × 3 grid' },
];

function getTierExample(config: SwappingConfig): string {
    if (config.tier === 'basic') {
        return config.layout === 'sequence'
            ? 'Swap positions 1 and 3: A B C → C B A.'
            : 'Swap R1C1 and R2C1: A B / C D → C B / A D.';
    }
    if (config.tier === 'group') {
        if (config.layout === 'sequence') {
            return 'Shift positions 1 through 3 left: A B C D → B C A D.';
        }
        if (config.layout === '2x3') {
            return 'Mirror left to right: A B C / D E F → C B A / F E D.';
        }
        return 'Rotate clockwise: A B / C D → C A / D B.';
    }
    return config.layout === 'sequence'
        ? '1. Swap positions 1 and 3. 2. Reverse positions 2 through 4. Apply step 2 to the changed order.'
        : '1. Swap columns 1 and 2. 2. Mirror top to bottom. Apply step 2 to the changed grid.';
}

export default function Setup({
    config,
    validationError,
    sampleStatus,
    onChange,
    onStart,
    onSample,
}: SetupProps) {
    const update = (patch: Partial<SwappingConfig>): void => onChange({ ...config, ...patch });
    const chooseLayout = (layout: SwappingLayout): void => {
        update({
            layout,
            length: layout === 'sequence' ? config.length : getGridSize(layout as GridLayout),
        });
    };

    return (
        <section className="swapping-setup" aria-labelledby="swapping-setup-title">
            <header className="swapping-heading">
                <p className="swapping-eyebrow">Working memory practice</p>
                <h2 id="swapping-setup-title">Set up a round</h2>
                <p>
                    Memorise the arrangement, apply each position-based instruction, then rebuild
                    the final order.
                </p>
            </header>

            <section className="swapping-panel" aria-labelledby="swapping-presets-title">
                <div className="swapping-section-heading">
                    <h2 id="swapping-presets-title">Choose a starting point</h2>
                    <p>You can adjust every setting below.</p>
                </div>
                <div className="swapping-presets">
                    {SWAPPING_PRESETS.map((preset) => (
                        <button
                            type="button"
                            className="swapping-choice-button"
                            key={preset.id}
                            onClick={() =>
                                onChange(createPresetConfig(preset.id, config.content, config.layout))
                            }
                        >
                            <strong>{preset.label}</strong>
                            <span>
                                {preset.operationCount} operation
                                {preset.operationCount === 1 ? '' : 's'} · {preset.tier}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="swapping-panel swapping-setup__custom" aria-labelledby="swapping-custom-title">
                <div className="swapping-section-heading">
                    <h2 id="swapping-custom-title">Custom round</h2>
                    <p>Starting load and manipulation difficulty change independently.</p>
                </div>

                <div className="swapping-form-grid">
                    <label className="swapping-field">
                        <span>Content</span>
                        <select
                            value={config.content}
                            onChange={(event) => update({ content: event.target.value as SwappingContent })}
                        >
                            {CONTENT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="swapping-field">
                        <span>Arrangement</span>
                        <select
                            value={config.layout}
                            onChange={(event) => chooseLayout(event.target.value as SwappingLayout)}
                        >
                            {LAYOUT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {config.layout === 'sequence' && (
                        <label className="swapping-field">
                            <span>Starting items</span>
                            <select
                                value={config.length}
                                onChange={(event) => update({ length: Number(event.target.value) })}
                            >
                                {Array.from(
                                    { length: MAX_SEQUENCE_LENGTH - MIN_SEQUENCE_LENGTH + 1 },
                                    (_, index) => MIN_SEQUENCE_LENGTH + index
                                ).map((length) => (
                                    <option key={length} value={length}>
                                        {length}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <label className="swapping-field">
                        <span>Starting pattern</span>
                        <select
                            value={config.pattern}
                            onChange={(event) => update({ pattern: event.target.value as StartingPattern })}
                        >
                            <option value="unique">Unique</option>
                            <option value="repeated">Repeated</option>
                        </select>
                    </label>

                    <label className="swapping-field">
                        <span>Operation tier</span>
                        <select
                            value={config.tier}
                            onChange={(event) => update({ tier: event.target.value as OperationTier })}
                        >
                            <option value="basic">Basic</option>
                            <option value="group">Group</option>
                            <option value="compound">Compound</option>
                        </select>
                    </label>

                    <label className="swapping-field">
                        <span>Atomic operations</span>
                        <select
                            value={config.operationCount}
                            onChange={(event) => update({ operationCount: Number(event.target.value) })}
                        >
                            {Array.from(
                                { length: MAX_OPERATION_COUNT - MIN_OPERATION_COUNT + 1 },
                                (_, index) => MIN_OPERATION_COUNT + index
                            ).map((count) => (
                                <option key={count} value={count}>
                                    {count}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <aside className="swapping-example" aria-label="Operation example">
                    <strong>{config.tier[0].toUpperCase() + config.tier.slice(1)} example</strong>
                    <span>{getTierExample(config)}</span>
                </aside>

                {config.content === 'audio' && (
                    <div className="swapping-sample">
                        <button type="button" className="swapping-button is-secondary" onClick={onSample}>
                            Play voice sample
                        </button>
                        {sampleStatus && (
                            <span className="swapping-status" role="status">
                                {sampleStatus}
                            </span>
                        )}
                    </div>
                )}

                {validationError != null && (
                    <p className="swapping-error" id="swapping-start-error" role="alert">
                        {validationError}
                    </p>
                )}

                <button
                    type="button"
                    className="swapping-button is-primary swapping-start"
                    onClick={onStart}
                    disabled={validationError != null}
                    aria-describedby={validationError == null ? undefined : 'swapping-start-error'}
                >
                    Start round
                </button>
            </section>
        </section>
    );
}
