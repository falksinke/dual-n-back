import { useEffect, useId, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ModeId } from '../../model/modalities';
import { AudioPackId } from '../../model/audioPacks';
import { isiMsFromTier } from '../../model/ladderPersistence';
import { msToSecondsLabel } from '../../model/isi';
import {
    loadUiPreferences,
    setHapticFeedbackEnabled,
} from '../../model/uiPreferences';
import { isIOS } from '../../haptics/haptics';
import { lureStageSummary } from '../adaptiveDisplay';
import IsiRangeSlider from './IsiRangeSlider';
import './SettingsPanel.scss';

interface SettingsPanelProps {
    open: boolean;
    onClose: () => void;
    onHapticsEnabledChange?: (enabled: boolean) => void;
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

const PLAY_MODE_OPTIONS: { id: 'free' | 'adaptive'; label: string }[] = [
    { id: 'free', label: 'Free-play' },
    { id: 'adaptive', label: 'Adaptive' },
];

function formatInterference(value: number): string {
    if (value === 0) return 'Off';
    if (value === 0.125) return 'Default (⅛)';
    const eighths = Math.round(value * 8);
    return `${eighths}/8`;
}

const SettingsPanel = ({ open, onClose, onHapticsEnabledChange }: SettingsPanelProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const ladderInfoId = useId();
    const [ladderInfoOpen, setLadderInfoOpen] = useState(false);
    const [hapticFeedbackEnabled, setHapticFeedbackEnabledState] = useState(
        () => loadUiPreferences().hapticFeedbackEnabled
    );
    const showIosHapticsHint = isIOS();
    const playMode = useGameStore((state) => state.settings.playMode);
    const level = useGameStore((state) => state.settings.level);
    const trials = useGameStore((state) => state.settings.trials);
    const isiMin = useGameStore((state) => state.settings.isiMin);
    const isiMax = useGameStore((state) => state.settings.isiMax);
    const allowCenterStimulus = useGameStore((state) => state.settings.allowCenterStimulus);
    const mode = useGameStore((state) => state.settings.mode);
    const audioPack = useGameStore((state) => state.settings.audioPack);
    const interferenceChance = useGameStore((state) => state.settings.interferenceChance);
    const variableN = useGameStore((state) => state.settings.variableN);
    const ladder = useGameStore((state) => state.ladder[mode]);
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
    const setPlayMode = useGameStore((state) => state.setPlayMode);
    const useBlockQuotas = useGameStore((state) => state.settings.useBlockQuotas);
    const setUseBlockQuotas = useGameStore((state) => state.setUseBlockQuotas);

    const isAdaptive = playMode === 'adaptive';
    const ladderIsi = isiMsFromTier(ladder.isiTier);

    useEffect(() => {
        if (!open) {
            setLadderInfoOpen(false);
            return;
        }

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
            <button
                type="button"
                className="settings-backdrop"
                tabIndex={-1}
                aria-label="Close settings"
                data-haptic-skip
                onClick={onClose}
            />
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
                    <button
                        type="button"
                        className="settings-close"
                        onClick={onClose}
                        aria-label="Close settings"
                        data-haptic-skip
                    >
                        ✕
                    </button>
                </div>

                <div className="settings-body">
                    <div className="settings-row">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">Training path</span>
                            <span className="settings-row-hint">Free-play or ladder-driven Adaptive</span>
                        </div>
                        <div className="settings-segment">
                            {PLAY_MODE_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`segment-btn${playMode === option.id ? ' is-active' : ''}`}
                                    onClick={() => setPlayMode(option.id)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

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

                    {isAdaptive ? (
                        <div className="settings-row settings-row--readonly settings-row--ladder">
                            <div className="settings-row-main">
                                <div className="settings-row-copy">
                                    <div className="settings-row-label-line">
                                        <span className="settings-row-label">Ladder</span>
                                        <button
                                            type="button"
                                            className={`settings-info-trigger${ladderInfoOpen ? ' is-open' : ''}`}
                                            aria-expanded={ladderInfoOpen}
                                            aria-controls={ladderInfoId}
                                            aria-label="How the adaptive ladder works"
                                            onClick={() => setLadderInfoOpen((value) => !value)}
                                        >
                                            <span aria-hidden="true">i</span>
                                        </button>
                                    </div>
                                    <span className="settings-row-hint">
                                        Memory load and interference from your progress
                                    </span>
                                </div>
                                <div className="settings-readout" aria-live="polite">
                                    <span>n={ladder.n}</span>
                                    <span>{lureStageSummary(ladder.lureStage)}</span>
                                    <span>ISI tier {ladder.isiTier}</span>
                                </div>
                            </div>
                            <div
                                id={ladderInfoId}
                                className={`settings-info-panel${ladderInfoOpen ? ' is-open' : ''}`}
                            >
                                <div className="settings-info-panel-inner">
                                    <p>
                                        Adaptive raises difficulty from your discrimination (d′), not raw accuracy. It
                                        scores each modality for hits, misses, false alarms, and correct rejections —
                                        separately for ordinary trials and temporal lures.
                                    </p>
                                    <ul>
                                        <li>
                                            <strong>n</strong> — how many trials back you must match
                                        </li>
                                        <li>
                                            <strong>Lure</strong> — a familiar item at the <em>wrong</em> lag (e.g.
                                            n−1 or n+1). It tempts a match press, but only true n-back counts. Stages
                                            A–E raise how often / how near those traps appear.
                                        </li>
                                        <li>
                                            <strong>ISI tier</strong> — presentation speed; only tightens after you can
                                            discriminate well
                                        </li>
                                    </ul>
                                    <p>
                                        Typical path: master clean matching → add interference (stages) → then raise n
                                        and ease lures back a step. Progress uses a rolling window of blocks with
                                        hysteresis, so one noisy block won’t bounce the level. Ladder state is saved
                                        per mode in this browser.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
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
                    )}

                    <div className="settings-row">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">Trials</span>
                            <span className="settings-row-hint">Block length · ← / →</span>
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

                    <div className={`settings-row settings-row--isi${isAdaptive ? ' is-disabled' : ''}`}>
                        <div className="settings-row-copy">
                            <span className="settings-row-label">ISI</span>
                            <span className="settings-row-hint">
                                {isAdaptive ? 'Set by ladder tier in Adaptive' : 'Inter-stimulus interval range'}
                            </span>
                        </div>
                        {isAdaptive ? (
                            <div className="settings-readout settings-readout--isi" aria-live="polite">
                                <span>{msToSecondsLabel(ladderIsi.isiMin)}s</span>
                                <span className="settings-readout-sep">–</span>
                                <span>{msToSecondsLabel(ladderIsi.isiMax)}s</span>
                            </div>
                        ) : (
                            <IsiRangeSlider
                                minMs={isiMin}
                                maxMs={isiMax}
                                onMinChange={setIsiMin}
                                onMaxChange={setIsiMax}
                            />
                        )}
                    </div>

                    {!isAdaptive && (
                        <>
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
                        </>
                    )}

                    <div className="settings-row">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">Cross-modal quotas</span>
                            <span className="settings-row-hint">
                                {isAdaptive
                                    ? 'Balance match and lure counts across modalities'
                                    : 'Applied in Adaptive training only'}
                            </span>
                        </div>
                        <button
                            type="button"
                            className={`settings-toggle${useBlockQuotas ? ' is-on' : ''}`}
                            role="switch"
                            aria-checked={useBlockQuotas}
                            onClick={() => setUseBlockQuotas(!useBlockQuotas)}
                        >
                            <span className="settings-toggle-knob" />
                            <span className="settings-toggle-label">{useBlockQuotas ? 'On' : 'Off'}</span>
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

                    <div className="settings-row">
                        <div className="settings-row-copy">
                            <span className="settings-row-label">Haptic feedback</span>
                            <span className="settings-row-hint">
                                {showIosHapticsHint
                                    ? 'Safari 17.4+ · enable System Haptics in Sounds & Haptics'
                                    : 'Vibration on supported devices · off by default'}
                            </span>
                        </div>
                        <button
                            type="button"
                            className={`settings-toggle${hapticFeedbackEnabled ? ' is-on' : ''}`}
                            role="switch"
                            aria-checked={hapticFeedbackEnabled}
                            data-action="toggle-haptics"
                            onClick={() => {
                                const next = !hapticFeedbackEnabled;
                                setHapticFeedbackEnabledState(next);
                                setHapticFeedbackEnabled(next);
                                onHapticsEnabledChange?.(next);
                            }}
                        >
                            <span className="settings-toggle-knob" />
                            <span className="settings-toggle-label">
                                {hapticFeedbackEnabled ? 'On' : 'Off'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
