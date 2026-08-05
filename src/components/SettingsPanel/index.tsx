import { useEffect, useId, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ModeId } from '../../model/modalities';
import { AudioPackId } from '../../model/audioPacks';
import { msToSecondsLabel } from '../../model/isi';
import { FAILS_TO_DEMOTE_STAGE } from '../../model/adaptiveController';
import { settingsFromCurriculum } from '../../model/adaptiveCurriculum';
import {
    FAILS_TO_DEMOTE,
    PROMOTE_MATCH_PCT,
    settingsFromLevel,
} from '../../model/adaptiveLevels';
import {
    loadUiPreferences,
    setHapticFeedbackEnabled,
} from '../../model/uiPreferences';
import { loadPlayerCode } from '../../model/playerCode';
import {
    applyPlayerCode,
    getSyncStatus,
    subscribeSyncStatus,
    type SyncStatus,
} from '../../sync/progressSync';
import { fireKind, isIOS } from '../../haptics/haptics';
import { matchProgressSummary, progressLevelSummary } from '../adaptiveDisplay';
import AnswerGraceSlider from './AnswerGraceSlider';
import IsiRangeSlider from './IsiRangeSlider';
import SettingsSection, { type SettingsSectionId } from './SettingsSection';
import './SettingsPanel.scss';

const DEFAULT_SECTION_OPEN: Record<SettingsSectionId, boolean> = {
    training: true,
    timing: true,
    challenge: false,
    board: false,
    feedback: false,
    sync: false,
};

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

const PLAY_MODE_OPTIONS: { id: 'free' | 'adaptive' | 'cyclic'; label: string }[] = [
    { id: 'free', label: 'Free-play' },
    { id: 'adaptive', label: 'Adaptive' },
    { id: 'cyclic', label: 'Cyclic' },
];

function formatInterference(value: number): string {
    if (value === 0) return 'Off';
    if (value === 0.125) return 'Default (⅛)';
    const eighths = Math.round(value * 8);
    return `${eighths}/8`;
}

function formatVariableNHold(hold: number): string {
    if (hold === 1) return 'Every trial';
    return `~Every ${hold} trials`;
}

function syncStatusLabel(status: SyncStatus): string {
    switch (status.kind) {
        case 'not_linked':
            return 'Not linked';
        case 'linking':
            return 'Linking…';
        case 'syncing':
            return 'Syncing…';
        case 'linked':
            return status.lastSyncedAt != null ? 'Linked · synced' : 'Linked';
        case 'error':
            return status.message;
        default:
            return 'Not linked';
    }
}

const SettingsPanel = ({ open, onClose, onHapticsEnabledChange }: SettingsPanelProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const ladderInfoId = useId();
    const playerCodeInputId = useId();
    const [ladderInfoOpen, setLadderInfoOpen] = useState(false);
    const [sectionOpen, setSectionOpen] = useState(DEFAULT_SECTION_OPEN);
    const [hapticFeedbackEnabled, setHapticFeedbackEnabledState] = useState(
        () => loadUiPreferences().hapticFeedbackEnabled
    );
    const [playerCodeDraft, setPlayerCodeDraft] = useState(() => loadPlayerCode() ?? '');
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncStatus());
    const [applyBusy, setApplyBusy] = useState(false);
    const showIosHapticsHint = isIOS();
    const playMode = useGameStore((state) => state.settings.playMode);
    const level = useGameStore((state) => state.settings.level);
    const trials = useGameStore((state) => state.settings.trials);
    const isiMin = useGameStore((state) => state.settings.isiMin);
    const isiMax = useGameStore((state) => state.settings.isiMax);
    const answerGraceMs = useGameStore((state) => state.settings.answerGraceMs);
    const allowCenterStimulus = useGameStore((state) => state.settings.allowCenterStimulus);
    const positionGrid = useGameStore((state) => state.settings.positionGrid);
    const displayVariableNCenter = useGameStore(
        (state) => state.settings.displayVariableNCenter
    );
    const mode = useGameStore((state) => state.settings.mode);
    const audioPack = useGameStore((state) => state.settings.audioPack);
    const interferenceChance = useGameStore((state) => state.settings.interferenceChance);
    const variableN = useGameStore((state) => state.settings.variableN);
    const variableNHoldTrials = useGameStore((state) => state.settings.variableNHoldTrials);
    const matchLadder = useGameStore((state) => state.ladder[mode]);
    const cyclicLadder = useGameStore((state) => state.cyclicLadder[mode]);
    const decreaseLevel = useGameStore((state) => state.decreaseLevel);
    const increaseLevel = useGameStore((state) => state.increaseLevel);
    const decreaseLadderStep = useGameStore((state) => state.decreaseLadderStep);
    const increaseLadderStep = useGameStore((state) => state.increaseLadderStep);
    const resetCyclicLearningProgress = useGameStore(
        (state) => state.resetCyclicLearningProgress
    );
    const decreaseTrials = useGameStore((state) => state.decreaseTrials);
    const increaseTrials = useGameStore((state) => state.increaseTrials);
    const setIsiMin = useGameStore((state) => state.setIsiMin);
    const setIsiMax = useGameStore((state) => state.setIsiMax);
    const setIsiBoth = useGameStore((state) => state.setIsiBoth);
    const setAnswerGraceMs = useGameStore((state) => state.setAnswerGraceMs);
    const setAllowCenterStimulus = useGameStore((state) => state.setAllowCenterStimulus);
    const setPositionGrid = useGameStore((state) => state.setPositionGrid);
    const setDisplayVariableNCenter = useGameStore(
        (state) => state.setDisplayVariableNCenter
    );
    const setMode = useGameStore((state) => state.setMode);
    const setAudioPack = useGameStore((state) => state.setAudioPack);
    const cycleInterferenceChance = useGameStore((state) => state.cycleInterferenceChance);
    const setVariableN = useGameStore((state) => state.setVariableN);
    const cycleVariableNHoldTrials = useGameStore((state) => state.cycleVariableNHoldTrials);
    const setPlayMode = useGameStore((state) => state.setPlayMode);
    const useBlockQuotas = useGameStore((state) => state.settings.useBlockQuotas);
    const setUseBlockQuotas = useGameStore((state) => state.setUseBlockQuotas);
    const useJaeggiQuotas = useGameStore((state) => state.settings.useJaeggiQuotas);
    const setUseJaeggiQuotas = useGameStore((state) => state.setUseJaeggiQuotas);
    const activeFeedback = useGameStore((state) => state.settings.activeFeedback);
    const setActiveFeedback = useGameStore((state) => state.setActiveFeedback);

    const isMatchAdaptive = playMode === 'adaptive';
    const isCyclic = playMode === 'cyclic';
    const isFreePlay = playMode === 'free';
    const isLadderMode = isMatchAdaptive || isCyclic;
    const isTwoByTwo = isFreePlay && positionGrid === '2x2';
    const matchProgressLevel = settingsFromLevel(matchLadder.levelIndex);
    const cyclicProgressLevel = settingsFromCurriculum(cyclicLadder);
    const progressLevel = isCyclic ? cyclicProgressLevel : matchProgressLevel;

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
        return subscribeSyncStatus(() => {
            setSyncStatus(getSyncStatus());
        });
    }, []);

    useEffect(() => {
        if (open) {
            setPlayerCodeDraft(loadPlayerCode() ?? '');
            setSyncStatus(getSyncStatus());
            panelRef.current?.querySelector<HTMLElement>('button, input')?.focus();
        }
    }, [open]);

    const onApplyPlayerCode = async () => {
        if (applyBusy) return;
        setApplyBusy(true);
        try {
            await applyPlayerCode(playerCodeDraft);
            setPlayerCodeDraft(loadPlayerCode() ?? playerCodeDraft.trim());
            fireKind('selection');
        } catch {
            // Status text already updated in progressSync.
        } finally {
            setApplyBusy(false);
            setSyncStatus(getSyncStatus());
        }
    };

    const toggleSection = (id: SettingsSectionId) => {
        setSectionOpen((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const pathLabel =
        playMode === 'free' ? 'Free-play' : playMode === 'adaptive' ? 'Adaptive' : 'Cyclic';
    const modeLabel = MODE_OPTIONS.find((option) => option.id === mode)?.label ?? mode;
    const trainingSummary = isLadderMode
        ? `${pathLabel} · ${modeLabel} · ${
              isCyclic
                  ? `${cyclicLadder.track === 'flexible' ? 'F' : 'C'}${cyclicLadder.n}`
                  : `L${matchLadder.levelIndex}`
          }`
        : `${pathLabel} · ${modeLabel} · n=${level} · ${trials} trials`;
    const timingSummary = isLadderMode
        ? `${msToSecondsLabel(progressLevel.isiMin)}–${msToSecondsLabel(progressLevel.isiMax)}s · +${answerGraceMs}ms`
        : `${msToSecondsLabel(isiMin)}–${msToSecondsLabel(isiMax)}s · +${answerGraceMs}ms`;
    const challengeSummary = isLadderMode
        ? `Quotas ${useBlockQuotas ? 'on' : 'off'} · VN switch ${formatVariableNHold(variableNHoldTrials)}`
        : `${formatInterference(interferenceChance)} · VN ${variableN ? 'on' : 'off'}`;
    const boardSummary = isFreePlay
        ? `${positionGrid}${allowCenterStimulus && positionGrid === '3x3' ? ' · center on' : ''}`
        : allowCenterStimulus
          ? '3×3 · center on'
          : '3×3';
    const feedbackSummary = `Match ${activeFeedback ? 'instant' : 'end'} · Haptics ${
        hapticFeedbackEnabled ? 'on' : 'off'
    }`;
    const syncSummary = syncStatusLabel(syncStatus);

    return (
        <div className={`settings-shell${open ? ' is-open' : ''}`} aria-hidden={!open}>
            <button
                type="button"
                className="settings-backdrop"
                tabIndex={-1}
                aria-label="Close settings"
                data-haptic="light"
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
                    <div className="settings-close-host haptic-host">
                        <button
                            type="button"
                            className="settings-close"
                            onClick={onClose}
                            aria-label="Close settings"
                            data-haptic="light"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="settings-body">
                    <SettingsSection
                        id="training"
                        title="Training"
                        summary={trainingSummary}
                        open={sectionOpen.training}
                        onToggle={() => toggleSection('training')}
                    >
                        <div className="settings-row">
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Training path</span>
                                <span className="settings-row-hint">
                                    Free-play · Match% Adaptive · Cyclic curriculum
                                </span>
                            </div>
                            <div className="settings-segment">
                                {PLAY_MODE_OPTIONS.map((option) => (
                                    <div key={option.id} className="segment-btn-host haptic-host">
                                        <button
                                            type="button"
                                            className={`segment-btn${playMode === option.id ? ' is-active' : ''}`}
                                            data-haptic="light"
                                            onClick={() => setPlayMode(option.id)}
                                        >
                                            {option.label}
                                        </button>
                                    </div>
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
                                    <div key={option.id} className="segment-btn-host haptic-host">
                                        <button
                                            type="button"
                                            className={`segment-btn${mode === option.id ? ' is-active' : ''}`}
                                            data-haptic="light"
                                            onClick={() => setMode(option.id)}
                                        >
                                            {option.label}
                                        </button>
                                    </div>
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
                                    <div key={option.id} className="segment-btn-host haptic-host">
                                        <button
                                            type="button"
                                            className={`segment-btn${audioPack === option.id ? ' is-active' : ''}`}
                                            data-haptic="light"
                                            onClick={() => setAudioPack(option.id)}
                                        >
                                            {option.label}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {isLadderMode ? (
                            <div className="settings-row settings-row--ladder">
                                <div className="settings-row-main">
                                    <div className="settings-row-copy">
                                        <div className="settings-row-label-line">
                                            <span className="settings-row-label">Ladder</span>
                                            <button
                                                type="button"
                                                className={`settings-info-trigger${ladderInfoOpen ? ' is-open' : ''}`}
                                                aria-expanded={ladderInfoOpen}
                                                aria-controls={ladderInfoId}
                                                aria-label={
                                                    isCyclic
                                                        ? 'How the cyclic ladder works'
                                                        : 'How the adaptive ladder works'
                                                }
                                                onClick={() => setLadderInfoOpen((value) => !value)}
                                            >
                                                <span aria-hidden="true">i</span>
                                            </button>
                                        </div>
                                        <span className="settings-row-hint">
                                            {isCyclic
                                                ? 'Manual step · lure-sensitive d′ gates after blocks'
                                                : `Manual step · Match% ≥${PROMOTE_MATCH_PCT}% promotes after blocks`}
                                        </span>
                                    </div>
                                    <div className="settings-ladder-controls">
                                        <div className="settings-stepper haptic-host">
                                            <button
                                                type="button"
                                                className="step-btn"
                                                data-haptic="light"
                                                onClick={decreaseLadderStep}
                                                aria-label="Decrease ladder step"
                                            >
                                                −
                                            </button>
                                            <span className="step-value" aria-live="polite">
                                                {isCyclic
                                                    ? `${cyclicLadder.track === 'flexible' ? 'F' : 'C'}${cyclicLadder.n}`
                                                    : `L${matchLadder.levelIndex}`}
                                            </span>
                                            <button
                                                type="button"
                                                className="step-btn"
                                                data-haptic="light"
                                                onClick={increaseLadderStep}
                                                aria-label="Increase ladder step"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="settings-readout" aria-live="polite">
                                            <span>n={progressLevel.n}</span>
                                            {isCyclic ? (
                                                <span>{cyclicLadder.stage.replace(/_/g, ' ')}</span>
                                            ) : (
                                                <span>
                                                    {progressLevel.variableN ? 'var N' : 'fixed N'}
                                                </span>
                                            )}
                                            <span>
                                                fails{' '}
                                                {isCyclic
                                                    ? `${cyclicLadder.failStreak}/${FAILS_TO_DEMOTE_STAGE}`
                                                    : `${matchLadder.failStreak}/${FAILS_TO_DEMOTE}`}
                                            </span>
                                        </div>
                                        {isCyclic && (
                                            <div className="settings-ladder-reset haptic-host">
                                                <button
                                                    type="button"
                                                    className="settings-ladder-reset__btn"
                                                    data-haptic="light"
                                                    onClick={resetCyclicLearningProgress}
                                                >
                                                    Reset cyclic learning
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div
                                    id={ladderInfoId}
                                    className={`settings-info-panel${ladderInfoOpen ? ' is-open' : ''}`}
                                >
                                    <div className="settings-info-panel-inner">
                                        {isCyclic ? (
                                            <>
                                                <p>
                                                    Cyclic teaches fixed-N one-slot updating (compare →
                                                    replace → next), then unlocks a flexible-lag track.
                                                    Assessed blocks use lure-sensitive d′ gates — not Match %
                                                    alone. {FAILS_TO_DEMOTE_STAGE} consecutive fails demote
                                                    one stage.
                                                </p>
                                                <ul>
                                                    <li>
                                                        <strong>Fixed track</strong> — reveal-first teach →
                                                        lures → speed → mastery
                                                    </li>
                                                    <li>
                                                        <strong>Then</strong> — flexible lag (variable N),
                                                        then raise n and re-teach
                                                    </li>
                                                    <li>
                                                        <strong>Current</strong> —{' '}
                                                        {progressLevelSummary(cyclicLadder)}
                                                    </li>
                                                </ul>
                                            </>
                                        ) : (
                                            <>
                                                <p>
                                                    Adaptive climbs a discrete Match% ladder: promote at ≥
                                                    {PROMOTE_MATCH_PCT}% overall Match; demote one step after{' '}
                                                    {FAILS_TO_DEMOTE} fails in a row. Per-n recipe adds
                                                    interference, tightens ISI, then variable N before
                                                    raising n.
                                                </p>
                                                <ul>
                                                    <li>
                                                        <strong>Current</strong> —{' '}
                                                        {matchProgressSummary(matchLadder)}
                                                    </li>
                                                </ul>
                                            </>
                                        )}
                                        <p>
                                            Use − / + to jump steps manually (clears the fail streak).
                                            Position is saved per mode (and with your player code when
                                            linked).
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
                                    <button
                                        type="button"
                                        className="step-btn"
                                        onClick={decreaseLevel}
                                        aria-label="Decrease level"
                                    >
                                        −
                                    </button>
                                    <span className="step-value">{level}</span>
                                    <button
                                        type="button"
                                        className="step-btn"
                                        onClick={increaseLevel}
                                        aria-label="Increase level"
                                    >
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
                                <button
                                    type="button"
                                    className="step-btn"
                                    onClick={decreaseTrials}
                                    aria-label="Decrease trials"
                                >
                                    −
                                </button>
                                <span className="step-value">{trials}</span>
                                <button
                                    type="button"
                                    className="step-btn"
                                    onClick={increaseTrials}
                                    aria-label="Increase trials"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        id="timing"
                        title="Timing"
                        summary={timingSummary}
                        open={sectionOpen.timing}
                        onToggle={() => toggleSection('timing')}
                    >
                        <div
                            className={`settings-row settings-row--isi${isLadderMode ? ' is-disabled' : ''}`}
                        >
                            <div className="settings-row-copy">
                                <span className="settings-row-label">ISI</span>
                                <span className="settings-row-hint">
                                    {isLadderMode
                                        ? isCyclic
                                            ? 'Set by the cyclic curriculum'
                                            : 'Set by the Match% ladder'
                                        : 'Onset pacing range · answers score at the minimum'}
                                </span>
                            </div>
                            {isLadderMode ? (
                                <div
                                    className="settings-readout settings-readout--isi"
                                    aria-live="polite"
                                >
                                    <span>{msToSecondsLabel(progressLevel.isiMin)}s</span>
                                    <span className="settings-readout-sep">–</span>
                                    <span>{msToSecondsLabel(progressLevel.isiMax)}s</span>
                                </div>
                            ) : (
                                <IsiRangeSlider
                                    minMs={isiMin}
                                    maxMs={isiMax}
                                    onMinChange={setIsiMin}
                                    onMaxChange={setIsiMax}
                                    onBothChange={setIsiBoth}
                                />
                            )}
                        </div>

                        <div className="settings-row settings-row--isi">
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Answer leeway</span>
                                <span className="settings-row-hint">
                                    Extra press time after the scoring window · helps at fast ISIs
                                </span>
                            </div>
                            <AnswerGraceSlider valueMs={answerGraceMs} onChange={setAnswerGraceMs} />
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        id="challenge"
                        title="Challenge"
                        summary={challengeSummary}
                        open={sectionOpen.challenge}
                        onToggle={() => toggleSection('challenge')}
                    >
                        {!isLadderMode && (
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
                                        <span className="settings-row-hint">
                                            Per-trial lag from beta distribution
                                        </span>
                                    </div>
                                    <div className="settings-toggle-host haptic-host">
                                        <button
                                            type="button"
                                            className={`settings-toggle${variableN ? ' is-on' : ''}`}
                                            role="switch"
                                            aria-checked={variableN}
                                            aria-label="Variable N"
                                            onClick={() => setVariableN(!variableN)}
                                        >
                                            <span className="settings-toggle-knob" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        <div
                            className={`settings-row${
                                !isLadderMode && !variableN ? ' is-disabled' : ''
                            }`}
                        >
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Variable N switch</span>
                                <span className="settings-row-hint">
                                    {isLadderMode
                                        ? 'Typical stretch before lag randomly resamples'
                                        : variableN
                                          ? 'Typical stretch before lag randomly resamples'
                                          : 'Turn on Variable N to use'}
                                </span>
                            </div>
                            <button
                                type="button"
                                className="settings-cycle"
                                aria-label="Variable N switch interval"
                                disabled={!isLadderMode && !variableN}
                                onClick={() => {
                                    if (!isLadderMode && !variableN) return;
                                    cycleVariableNHoldTrials();
                                }}
                            >
                                {formatVariableNHold(variableNHoldTrials)}
                            </button>
                        </div>

                        <div className={`settings-row${isLadderMode ? ' is-disabled' : ''}`}>
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Jaeggi match quotas</span>
                                <span className="settings-row-hint">
                                    {isLadderMode
                                        ? 'Free-play only · fixed match counts per block'
                                        : variableN
                                          ? 'Variable N uses the same target density via its own plan'
                                          : 'Fixed matches per block (4+4+2 at 20 trials) · on by default'}
                                </span>
                            </div>
                            <div className="settings-toggle-host haptic-host">
                                <button
                                    type="button"
                                    className={`settings-toggle${useJaeggiQuotas ? ' is-on' : ''}`}
                                    role="switch"
                                    aria-checked={useJaeggiQuotas}
                                    aria-label="Jaeggi match quotas"
                                    aria-disabled={isLadderMode}
                                    disabled={isLadderMode}
                                    onClick={() => {
                                        if (isLadderMode) return;
                                        setUseJaeggiQuotas(!useJaeggiQuotas);
                                    }}
                                >
                                    <span className="settings-toggle-knob" />
                                </button>
                            </div>
                        </div>

                        <div className="settings-row">
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Cross-modal quotas</span>
                                <span className="settings-row-hint">
                                    {isLadderMode
                                        ? 'Balance match and lure counts across modalities'
                                        : 'Applied in Adaptive / Cyclic training only'}
                                </span>
                            </div>
                            <div className="settings-toggle-host haptic-host">
                                <button
                                    type="button"
                                    className={`settings-toggle${useBlockQuotas ? ' is-on' : ''}`}
                                    role="switch"
                                    aria-checked={useBlockQuotas}
                                    aria-label="Cross-modal quotas"
                                    onClick={() => setUseBlockQuotas(!useBlockQuotas)}
                                >
                                    <span className="settings-toggle-knob" />
                                </button>
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        id="board"
                        title="Board"
                        summary={boardSummary}
                        open={sectionOpen.board}
                        onToggle={() => toggleSection('board')}
                    >
                        {isFreePlay && (
                            <div className="settings-row">
                                <div className="settings-row-copy">
                                    <span className="settings-row-label">Size</span>
                                    <span className="settings-row-hint">
                                        3×3 standard · 2×2 easier spatial load
                                    </span>
                                </div>
                                <div className="settings-segment">
                                    {(
                                        [
                                            { id: '3x3' as const, label: '3×3' },
                                            { id: '2x2' as const, label: '2×2' },
                                        ] as const
                                    ).map((option) => (
                                        <div
                                            key={option.id}
                                            className="segment-btn-host haptic-host"
                                        >
                                            <button
                                                type="button"
                                                className={`segment-btn${positionGrid === option.id ? ' is-active' : ''}`}
                                                data-haptic="light"
                                                aria-pressed={positionGrid === option.id}
                                                onClick={() => setPositionGrid(option.id)}
                                            >
                                                {option.label}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className={`settings-row${isTwoByTwo ? ' is-disabled' : ''}`}>
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Center cell</span>
                                <span className="settings-row-hint">
                                    {isTwoByTwo
                                        ? 'Only on 3×3 board'
                                        : 'Stimulus in the middle square'}
                                </span>
                            </div>
                            <div className="settings-toggle-host haptic-host">
                                <button
                                    type="button"
                                    className={`settings-toggle${allowCenterStimulus ? ' is-on' : ''}`}
                                    role="switch"
                                    aria-checked={allowCenterStimulus}
                                    aria-label="Center cell"
                                    aria-disabled={isTwoByTwo}
                                    disabled={isTwoByTwo}
                                    onClick={() => {
                                        if (isTwoByTwo) return;
                                        setAllowCenterStimulus(!allowCenterStimulus);
                                    }}
                                >
                                    <span className="settings-toggle-knob" />
                                </button>
                            </div>
                        </div>

                        <div
                            className={`settings-row${allowCenterStimulus || isTwoByTwo ? ' is-disabled' : ''}`}
                        >
                            <div className="settings-row-copy">
                                <span className="settings-row-label">N in center</span>
                                <span className="settings-row-hint">
                                    {isTwoByTwo
                                        ? 'Only on 3×3 board'
                                        : allowCenterStimulus
                                          ? 'Turn off Center cell to use'
                                          : 'Show current Variable N lag in the middle square'}
                                </span>
                            </div>
                            <div className="settings-toggle-host haptic-host">
                                <button
                                    type="button"
                                    className={`settings-toggle${displayVariableNCenter ? ' is-on' : ''}`}
                                    role="switch"
                                    aria-checked={displayVariableNCenter}
                                    aria-label="N in center"
                                    aria-disabled={allowCenterStimulus || isTwoByTwo}
                                    disabled={allowCenterStimulus || isTwoByTwo}
                                    onClick={() => {
                                        if (allowCenterStimulus || isTwoByTwo) return;
                                        setDisplayVariableNCenter(!displayVariableNCenter);
                                    }}
                                >
                                    <span className="settings-toggle-knob" />
                                </button>
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        id="feedback"
                        title="Feedback"
                        summary={feedbackSummary}
                        open={sectionOpen.feedback}
                        onToggle={() => toggleSection('feedback')}
                    >
                        <div className="settings-row">
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Instant match feedback</span>
                                <span className="settings-row-hint">
                                    Green/red on press · off waits until trial end
                                </span>
                            </div>
                            <div className="settings-toggle-host haptic-host">
                                <button
                                    type="button"
                                    className={`settings-toggle${activeFeedback ? ' is-on' : ''}`}
                                    role="switch"
                                    aria-checked={activeFeedback}
                                    aria-label="Instant match feedback"
                                    onClick={() => setActiveFeedback(!activeFeedback)}
                                >
                                    <span className="settings-toggle-knob" />
                                </button>
                            </div>
                        </div>

                        <div className="settings-row">
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Haptic feedback</span>
                                <span className="settings-row-hint">
                                    {showIosHapticsHint
                                        ? 'On by default · Safari 17.4+ · enable System Haptics in Sounds & Haptics'
                                        : 'On by default · vibration confirms match taps'}
                                </span>
                            </div>
                            <div className="settings-toggle-host haptic-host">
                                <button
                                    type="button"
                                    className={`settings-toggle${hapticFeedbackEnabled ? ' is-on' : ''}`}
                                    role="switch"
                                    aria-checked={hapticFeedbackEnabled}
                                    aria-label="Haptic feedback"
                                    data-action="toggle-haptics"
                                    onClick={() => {
                                        const next = !hapticFeedbackEnabled;
                                        setHapticFeedbackEnabledState(next);
                                        setHapticFeedbackEnabled(next);
                                        onHapticsEnabledChange?.(next);
                                        if (next) {
                                            fireKind('selection');
                                        }
                                    }}
                                >
                                    <span className="settings-toggle-knob" />
                                </button>
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        id="sync"
                        title="Sync"
                        summary={syncSummary}
                        open={sectionOpen.sync}
                        onToggle={() => toggleSection('sync')}
                    >
                        <div className="settings-row settings-row--stack">
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Player code</span>
                                <span className="settings-row-hint">
                                    Same code on another device loads this progress. Anyone with the
                                    code can change it.
                                </span>
                            </div>
                            <div className="settings-player-code">
                                <label className="visually-hidden" htmlFor={playerCodeInputId}>
                                    Player code
                                </label>
                                <input
                                    id={playerCodeInputId}
                                    className="settings-player-code-input"
                                    type="text"
                                    autoComplete="off"
                                    spellCheck={false}
                                    minLength={6}
                                    maxLength={64}
                                    placeholder="Enter a code"
                                    value={playerCodeDraft}
                                    onChange={(e) => setPlayerCodeDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            void onApplyPlayerCode();
                                        }
                                    }}
                                />
                                <div className="settings-player-code-actions haptic-host">
                                    <button
                                        type="button"
                                        className="settings-player-code-apply"
                                        data-haptic="light"
                                        disabled={applyBusy || playerCodeDraft.trim().length < 6}
                                        onClick={() => void onApplyPlayerCode()}
                                    >
                                        {applyBusy ? '…' : 'Apply'}
                                    </button>
                                </div>
                            </div>
                            <span
                                className={`settings-player-code-status${
                                    syncStatus.kind === 'error' ? ' is-error' : ''
                                }`}
                                role="status"
                            >
                                {syncStatusLabel(syncStatus)}
                            </span>
                        </div>
                    </SettingsSection>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
