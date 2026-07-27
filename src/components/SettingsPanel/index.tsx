import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ModeId } from '../../model/modalities';
import { AudioPackId } from '../../model/audioPacks';
import IsiRangeSlider from './IsiRangeSlider';
import './SettingsPanel.scss';

interface SettingsPanelProps {
    open: boolean;
    onClose: () => void;
}

const MODE_OPTIONS: { id: ModeId; label: string }[] = [
    { id: 'dual', label: 'Dual' },
    { id: 'triple', label: 'Triple' },
    { id: 'quad', label: 'Quad' },
];

const PACK_OPTIONS: { id: AudioPackId; label: string }[] = [
    { id: 'letters', label: 'Letters' },
    { id: 'piano', label: 'Piano' },
];

function formatInterference(value: number): string {
    if (value === 0) return 'Off';
    if (value === 0.125) return 'Default (⅛)';
    const eighths = Math.round(value * 8);
    return `${eighths}/8`;
}

const SettingsPanel = ({ open, onClose }: SettingsPanelProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const level = useGameStore((state) => state.settings.level);
    const trials = useGameStore((state) => state.settings.trials);
    const isiMin = useGameStore((state) => state.settings.isiMin);
    const isiMax = useGameStore((state) => state.settings.isiMax);
    const allowCenterStimulus = useGameStore((state) => state.settings.allowCenterStimulus);
    const mode = useGameStore((state) => state.settings.mode);
    const audioPack = useGameStore((state) => state.settings.audioPack);
    const interferenceChance = useGameStore((state) => state.settings.interferenceChance);
    const variableN = useGameStore((state) => state.settings.variableN);
    const decreaseLevel = useGameStore((state) => state.decreaseLevel);
    const increaseLevel = useGameStore((state) => state.increaseLevel);
    const decreaseTrials = useGameStore((state) => state.decreaseTrials);
    const increaseTrials = useGameStore((state) => state.increaseTrials);
    const setIsiMin = useGameStore((state) => state.setIsiMin);
    const setIsiMax = useGameStore((state) => state.setIsiMax);
    const setAllowCenterStimulus = useGameStore((state) => state.setAllowCenterStimulus);
    const setMode = useGameStore((state) => state.setMode);
    const setAudioPack = useGameStore((state) => state.setAudioPack);
    const cycleInterferenceChance = useGameStore((state) => state.cycleInterferenceChance);
    const setVariableN = useGameStore((state) => state.setVariableN);

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };

        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [open, onClose]);

    useEffect(() => {
        if (open) {
            panelRef.current?.querySelector<HTMLElement>('button, input')?.focus();
        }
    }, [open]);

    return (
        <div className={`settings-shell${open ? ' is-open' : ''}`} aria-hidden={!open}>
            <button type="button" className="settings-backdrop" tabIndex={-1} aria-label="Close settings" onClick={onClose} />
            <div
                ref={panelRef}
                className="settings-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
            >
                <div className="settings-header">
                    <h2 id="settings-title" className="settings-title">
                        Trial settings
                    </h2>
                    <button type="button" className="settings-close" onClick={onClose} aria-label="Close settings">
                        ✕
                    </button>
                </div>

                <div className="settings-body">
                    <div className="settings-row">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">Mode</span>
                            <span className="settings-row-hint">Dual · Triple · Quad</span>
                        </div>
                        <div className="settings-segment">
                            {MODE_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`segment-btn${mode === option.id ? ' is-active' : ''}`}
                                    onClick={() => setMode(option.id)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">Audio pack</span>
                            <span className="settings-row-hint">Letters or piano notes</span>
                        </div>
                        <div className="settings-segment">
                            {PACK_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`segment-btn${audioPack === option.id ? ' is-active' : ''}`}
                                    onClick={() => setAudioPack(option.id)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">Level</span>
                            <span className="settings-row-hint">N-back depth · ↑ / ↓</span>
                        </div>
                        <div className="settings-stepper">
                            <button type="button" className="step-btn" onClick={decreaseLevel} aria-label="Decrease level">
                                −
                            </button>
                            <span className="step-value">{level}</span>
                            <button type="button" className="step-btn" onClick={increaseLevel} aria-label="Increase level">
                                +
                            </button>
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">Trials</span>
                            <span className="settings-row-hint">Session length · ← / →</span>
                        </div>
                        <div className="settings-stepper">
                            <button type="button" className="step-btn" onClick={decreaseTrials} aria-label="Decrease trials">
                                −
                            </button>
                            <span className="step-value">{trials}</span>
                            <button type="button" className="step-btn" onClick={increaseTrials} aria-label="Increase trials">
                                +
                            </button>
                        </div>
                    </div>

                    <div className="settings-row settings-row--isi">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">ISI</span>
                            <span className="settings-row-hint">Inter-stimulus interval range</span>
                        </div>
                        <IsiRangeSlider
                            minMs={isiMin}
                            maxMs={isiMax}
                            onMinChange={setIsiMin}
                            onMaxChange={setIsiMax}
                        />
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">Interference</span>
                            <span className="settings-row-hint">Near-miss bias chance</span>
                        </div>
                        <button
                            type="button"
                            className="settings-cycle"
                            onClick={cycleInterferenceChance}
                        >
                            {formatInterference(interferenceChance)}
                        </button>
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">Variable N</span>
                            <span className="settings-row-hint">Per-trial lag from beta distribution</span>
                        </div>
                        <button
                            type="button"
                            className={`settings-toggle${variableN ? ' is-on' : ''}`}
                            role="switch"
                            aria-checked={variableN}
                            onClick={() => setVariableN(!variableN)}
                        >
                            <span className="settings-toggle-knob" />
                            <span className="settings-toggle-label">{variableN ? 'On' : 'Off'}</span>
                        </button>
                    </div>

                    <div className="settings-row">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">Center cell</span>
                            <span className="settings-row-hint">Stimulus in the middle square</span>
                        </div>
                        <button
                            type="button"
                            className={`settings-toggle${allowCenterStimulus ? ' is-on' : ''}`}
                            role="switch"
                            aria-checked={allowCenterStimulus}
                            onClick={() => setAllowCenterStimulus(!allowCenterStimulus)}
                        >
                            <span className="settings-toggle-knob" />
                            <span className="settings-toggle-label">{allowCenterStimulus ? 'On' : 'Off'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
