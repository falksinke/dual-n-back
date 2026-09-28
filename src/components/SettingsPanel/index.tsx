import { useEffect, useId, useRef, useState } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useGameStore } from '../../store/gameStore';
import {
    ALL_MODALITIES,
    MODALITY_LABELS,
    ModeId,
    ModalityId,
    TRIPLE_COMBINATIONS,
    tripleCombinationLabel,
} from '../../model/modalities';
import { AudioPackId } from '../../model/audioPacks';
import type { ImageDifficulty } from '../../model/imageSet';
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
import { loadProfile } from '../../model/profile';
import {
    applyProfile,
    getSyncStatus,
    listProfiles,
    subscribeSyncStatus,
    useCloudProgress,
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
    // Timing is tall; keep it closed so Challenge/Board controls stay reachable.
    timing: false,
    challenge: true,
    board: true,
    feedback: false,
    sync: false,
};

interface SettingsPanelProps {
    open: boolean;
    onClose: () => void;
    onHapticsEnabledChange?: (enabled: boolean) => void;
}

const MODE_OPTIONS: { id: ModeId; label: string }[] = [
    { id: 'single', label: 'Single' },
    { id: 'dual', label: 'Dual' },
    { id: 'triple', label: 'Triple' },
    { id: 'quad', label: 'Quad' },
];

const PACK_OPTIONS: { id: AudioPackId; label: string }[] = [
    { id: 'letters', label: 'Letters' },
    { id: 'piano', label: 'Piano' },
];

const IMAGE_DIFFICULTY_OPTIONS: { id: ImageDifficulty; label: string }[] = [
    { id: 'easy', label: 'Easy' },
    { id: 'hard', label: 'Hard' },
];

const PLAY_MODE_OPTIONS: { id: 'free' | 'adaptive' | 'cyclic'; label: string }[] = [
    { id: 'free', label: 'Free-play' },
    { id: 'adaptive', label: 'Adaptive' },
    { id: 'cyclic', label: 'Cyclic' },
];

function formatInterference(value: number | 'easy'): string {
    if (value === 'easy') return 'Easy';
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
        case 'conflict':
            return status.message;
        default:
            return 'Not linked';
    }
}

const SettingsPanel = ({ open, onClose, onHapticsEnabledChange }: SettingsPanelProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const ladderInfoId = useId();
    const profileInputId = useId();
    const [ladderInfoOpen, setLadderInfoOpen] = useState(false);
    const [sectionOpen, setSectionOpen] = useState(DEFAULT_SECTION_OPEN);
    const [hapticFeedbackEnabled, setHapticFeedbackEnabledState] = useState(
        () => loadUiPreferences().hapticFeedbackEnabled
    );
    const [profileDraft, setProfileDraft] = useState(() => loadProfile() ?? '');
    const [profiles, setProfiles] = useState<string[]>([]);
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
    const singleModality = useGameStore((state) => state.settings.singleModality);
    const showPositionRecency = useGameStore((state) => state.settings.showPositionRecency);
    const rotatingBoard = useGameStore((state) => state.settings.rotatingBoard);
    const tripleModalities = useGameStore((state) => state.settings.tripleModalities);
    const audioPack = useGameStore((state) => state.settings.audioPack);
    const imageDifficulty = useGameStore((state) => state.settings.imageDifficulty);
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
    const stepwisePacing = useGameStore((state) => state.settings.stepwisePacing);
    const setStepwisePacing = useGameStore((state) => state.setStepwisePacing);
    const setAllowCenterStimulus = useGameStore((state) => state.setAllowCenterStimulus);
    const setPositionGrid = useGameStore((state) => state.setPositionGrid);
    const setDisplayVariableNCenter = useGameStore(
        (state) => state.setDisplayVariableNCenter
    );
    const setMode = useGameStore((state) => state.setMode);
    const setSingleModality = useGameStore((state) => state.setSingleModality);
    const setShowPositionRecency = useGameStore((state) => state.setShowPositionRecency);
    const setRotatingBoard = useGameStore((state) => state.setRotatingBoard);
    const setTripleModalities = useGameStore((state) => state.setTripleModalities);
    const setAudioPack = useGameStore((state) => state.setAudioPack);
    const setImageDifficulty = useGameStore((state) => state.setImageDifficulty);
    const cycleInterferenceChance = useGameStore((state) => state.cycleInterferenceChance);
    const setVariableN = useGameStore((state) => state.setVariableN);
    const cycleVariableNHoldTrials = useGameStore((state) => state.cycleVariableNHoldTrials);
    const setPlayMode = useGameStore((state) => state.setPlayMode);
    const useBlockQuotas = useGameStore((state) => state.settings.useBlockQuotas);
    const setUseBlockQuotas = useGameStore((state) => state.setUseBlockQuotas);
    const useJaeggiQuotas = useGameStore((state) => state.settings.useJaeggiQuotas);
    const setUseJaeggiQuotas = useGameStore((state) => state.setUseJaeggiQuotas);
    const dailyRounds = useGameStore((state) => state.settings.dailyRounds);
    const dailySessions = useGameStore((state) => state.settings.dailySessions);
    const setDailyRounds = useGameStore((state) => state.setDailyRounds);
    const setDailySessions = useGameStore((state) => state.setDailySessions);
    const freePlayAutoProgress = useGameStore((state) => state.settings.freePlayAutoProgress);
    const freePlayPromotePct = useGameStore((state) => state.settings.freePlayPromotePct);
    const freePlayDemotePct = useGameStore((state) => state.settings.freePlayDemotePct);
    const freePlayFailsToDemote = useGameStore(
        (state) => state.settings.freePlayFailsToDemote
    );
    const freePlayDemoteRequiresConsecutive = useGameStore(
        (state) => state.settings.freePlayDemoteRequiresConsecutive
    );
    const setFreePlayAutoProgress = useGameStore((state) => state.setFreePlayAutoProgress);
    const setFreePlayPromotePct = useGameStore((state) => state.setFreePlayPromotePct);
    const setFreePlayDemotePct = useGameStore((state) => state.setFreePlayDemotePct);
    const setFreePlayFailsToDemote = useGameStore(
        (state) => state.setFreePlayFailsToDemote
    );
    const setFreePlayDemoteRequiresConsecutive = useGameStore(
        (state) => state.setFreePlayDemoteRequiresConsecutive
    );
    const activeFeedback = useGameStore((state) => state.settings.activeFeedback);
    const setActiveFeedback = useGameStore((state) => state.setActiveFeedback);

    const isMatchAdaptive = playMode === 'adaptive';
    const isCyclic = playMode === 'cyclic';
    const isFreePlay = playMode === 'free';
    const isLadderMode = isMatchAdaptive || isCyclic;
    const pinCenterNoPosition =
        (mode === 'single' && singleModality !== 'position') ||
        (mode === 'triple' && !tripleModalities.includes('position'));
    const isTwoByTwo = isFreePlay && positionGrid === '2x2' && !pinCenterNoPosition;
    const matchProgressLevel = settingsFromLevel(matchLadder.levelIndex);
    const cyclicProgressLevel = settingsFromCurriculum(cyclicLadder);
    const progressLevel = isCyclic ? cyclicProgressLevel : matchProgressLevel;

    useModalA11y({
        active: open,
        onEscape: onClose,
        containerRef: panelRef,
        enableTrap: true,
        restoreTarget: '.settings-trigger',
    });

    useEffect(() => {
        if (!open) {
            setLadderInfoOpen(false);
            return;
        }
        setProfileDraft(loadProfile() ?? '');
        setSyncStatus(getSyncStatus());
    }, [open]);

    useEffect(() => {
        return subscribeSyncStatus(() => {
            setSyncStatus(getSyncStatus());
        });
    }, []);

    const onApplyProfile = async (profile = profileDraft) => {
        if (applyBusy) return;
        setApplyBusy(true);
        try {
            await applyProfile(profile);
            const selected = loadProfile() ?? profile.trim();
            setProfileDraft(selected);
            setProfiles(await listProfiles());
            fireKind('selection');
        } catch {
            // Status text already updated in progressSync.
        } finally {
            setApplyBusy(false);
            setSyncStatus(getSyncStatus());
        }
    };

    const onUseCloudProgress = async () => {
        if (applyBusy) return;
        setApplyBusy(true);
        try {
            await useCloudProgress();
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
        if (id === 'sync' && !sectionOpen.sync) {
            void listProfiles().then(setProfiles).catch(() => undefined);
        }
    };

    const pathLabel =
        playMode === 'free' ? 'Free-play' : playMode === 'adaptive' ? 'Adaptive' : 'Cyclic';
    const modeLabel = MODE_OPTIONS.find((option) => option.id === mode)?.label ?? mode;
    const trainingSummary = isLadderMode
        ? `${pathLabel} · ${modeLabel} · ${
              isCyclic
                  ? `${cyclicLadder.track === 'flexible' ? 'F' : 'C'}${cyclicLadder.n}`
                  : `L${matchLadder.levelIndex}`
          } · ${dailyRounds}r/${dailySessions}s`
        : `${pathLabel} · ${modeLabel} · n=${level} · ${trials} trials · ${dailyRounds}r/${dailySessions}s`;
    const timingSummary = isLadderMode
        ? `${msToSecondsLabel(progressLevel.isiMin)}–${msToSecondsLabel(progressLevel.isiMax)}s · +${answerGraceMs}ms${stepwisePacing ? ' · paced' : ''}`
        : `${msToSecondsLabel(isiMin)}–${msToSecondsLabel(isiMax)}s · +${answerGraceMs}ms${stepwisePacing ? ' · paced' : ''}`;
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
                                <span className="settings-row-hint">Single · Dual · Triple · Quad</span>
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

                        {mode === 'single' && (
                            <div className="settings-row">
                                <div className="settings-row-copy">
                                    <span className="settings-row-label">Single stream</span>
                                    <span className="settings-row-hint">
                                        Used in Free-play, Adaptive, and Cyclic
                                    </span>
                                </div>
                                <div className="settings-segment settings-segment--wrap">
                                    {ALL_MODALITIES.map((modality) => (
                                        <div
                                            key={modality}
                                            className="segment-btn-host haptic-host"
                                        >
                                            <button
                                                type="button"
                                                className={`segment-btn${singleModality === modality ? ' is-active' : ''}`}
                                                data-haptic="light"
                                                aria-pressed={singleModality === modality}
                                                onClick={() => setSingleModality(modality)}
                                            >
                                                {MODALITY_LABELS[modality]}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {mode === 'triple' && (
                            <div className="settings-row">
                                <div className="settings-row-copy">
                                    <span className="settings-row-label">Triple streams</span>
                                    <span className="settings-row-hint">
                                        Pick which three modalities · no Position pins to center
                                    </span>
                                </div>
                                <div className="settings-segment settings-segment--wrap">
                                    {TRIPLE_COMBINATIONS.map((combo) => {
                                        const label = tripleCombinationLabel(combo);
                                        const active =
                                            tripleCombinationLabel(tripleModalities) === label;
                                        return (
                                            <div
                                                key={label}
                                                className="segment-btn-host haptic-host"
                                            >
                                                <button
                                                    type="button"
                                                    className={`segment-btn${active ? ' is-active' : ''}`}
                                                    data-haptic="light"
                                                    aria-pressed={active}
                                                    onClick={() =>
                                                        setTripleModalities(combo as ModalityId[])
                                                    }
                                                >
                                                    {label}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

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

                        <div className="settings-row">
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Image set</span>
                                <span className="settings-row-hint">
                                    Easy has 150 simple forms · Hard has 250 abstract forms
                                </span>
                            </div>
                            <div className="settings-segment">
                                {IMAGE_DIFFICULTY_OPTIONS.map((option) => (
                                    <div key={option.id} className="segment-btn-host haptic-host">
                                        <button
                                            type="button"
                                            className={`segment-btn${imageDifficulty === option.id ? ' is-active' : ''}`}
                                            data-haptic="light"
                                            aria-pressed={imageDifficulty === option.id}
                                            onClick={() => setImageDifficulty(option.id)}
                                        >
                                            {option.label}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="settings-row">
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Daily rounds</span>
                                <span className="settings-row-hint">
                                    Goal dots in the topbar · 0 hides them · day resets at 04:00
                                </span>
                            </div>
                            <div className="settings-stepper">
                                <button
                                    type="button"
                                    className="step-btn"
                                    onClick={() => setDailyRounds(dailyRounds - 1)}
                                    aria-label="Decrease daily rounds"
                                >
                                    −
                                </button>
                                <span className="step-value">{dailyRounds}</span>
                                <button
                                    type="button"
                                    className="step-btn"
                                    onClick={() => setDailyRounds(dailyRounds + 1)}
                                    aria-label="Increase daily rounds"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="settings-row">
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Daily sessions</span>
                                <span className="settings-row-hint">
                                    Groups dots with spacing · last filled dot marks session end
                                </span>
                            </div>
                            <div className="settings-stepper">
                                <button
                                    type="button"
                                    className="step-btn"
                                    onClick={() => setDailySessions(dailySessions - 1)}
                                    aria-label="Decrease daily sessions"
                                >
                                    −
                                </button>
                                <span className="step-value">{dailySessions}</span>
                                <button
                                    type="button"
                                    className="step-btn"
                                    onClick={() => setDailySessions(dailySessions + 1)}
                                    aria-label="Increase daily sessions"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {isFreePlay && (
                            <>
                                <div className="settings-row">
                                    <div className="settings-row-copy">
                                        <span className="settings-row-label">Auto progress</span>
                                        <span className="settings-row-hint">
                                            Adjust n from Match % · trials / ISI / interference stay
                                            put
                                        </span>
                                    </div>
                                    <div className="settings-toggle-host haptic-host">
                                        <button
                                            type="button"
                                            className={`settings-toggle${freePlayAutoProgress ? ' is-on' : ''}`}
                                            role="switch"
                                            aria-checked={freePlayAutoProgress}
                                            aria-label="Free-play auto progress"
                                            data-haptic="light"
                                            onClick={() =>
                                                setFreePlayAutoProgress(!freePlayAutoProgress)
                                            }
                                        >
                                            <span className="settings-toggle-knob" />
                                        </button>
                                    </div>
                                </div>

                                <div
                                    className={`settings-auto-progress${freePlayAutoProgress ? ' is-open' : ''}`}
                                >
                                    <div className="settings-auto-progress__inner">
                                        <div className="settings-row">
                                            <div className="settings-row-copy">
                                                <span className="settings-row-label">
                                                    Promote at
                                                </span>
                                                <span className="settings-row-hint">
                                                    Match % threshold
                                                </span>
                                            </div>
                                            <div className="settings-stepper">
                                                <button
                                                    type="button"
                                                    className="step-btn"
                                                    onClick={() =>
                                                        setFreePlayPromotePct(
                                                            freePlayPromotePct - 5
                                                        )
                                                    }
                                                    aria-label="Decrease promote percent"
                                                >
                                                    −
                                                </button>
                                                <span className="step-value">
                                                    {freePlayPromotePct}%
                                                </span>
                                                <button
                                                    type="button"
                                                    className="step-btn"
                                                    onClick={() =>
                                                        setFreePlayPromotePct(
                                                            freePlayPromotePct + 5
                                                        )
                                                    }
                                                    aria-label="Increase promote percent"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <div className="settings-row">
                                            <div className="settings-row-copy">
                                                <span className="settings-row-label">
                                                    Demote below
                                                </span>
                                                <span className="settings-row-hint">
                                                    Match % threshold
                                                </span>
                                            </div>
                                            <div className="settings-stepper">
                                                <button
                                                    type="button"
                                                    className="step-btn"
                                                    onClick={() =>
                                                        setFreePlayDemotePct(freePlayDemotePct - 5)
                                                    }
                                                    aria-label="Decrease demote percent"
                                                >
                                                    −
                                                </button>
                                                <span className="step-value">
                                                    {freePlayDemotePct}%
                                                </span>
                                                <button
                                                    type="button"
                                                    className="step-btn"
                                                    onClick={() =>
                                                        setFreePlayDemotePct(freePlayDemotePct + 5)
                                                    }
                                                    aria-label="Increase demote percent"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <div className="settings-row">
                                            <div className="settings-row-copy">
                                                <span className="settings-row-label">
                                                    Blocks to demote
                                                </span>
                                                <span className="settings-row-hint">
                                                    Blocks below demote threshold
                                                </span>
                                            </div>
                                            <div className="settings-stepper">
                                                <button
                                                    type="button"
                                                    className="step-btn"
                                                    onClick={() =>
                                                        setFreePlayFailsToDemote(
                                                            freePlayFailsToDemote - 1
                                                        )
                                                    }
                                                    aria-label="Decrease fails to demote"
                                                >
                                                    −
                                                </button>
                                                <span className="step-value">
                                                    {freePlayFailsToDemote}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="step-btn"
                                                    onClick={() =>
                                                        setFreePlayFailsToDemote(
                                                            freePlayFailsToDemote + 1
                                                        )
                                                    }
                                                    aria-label="Increase fails to demote"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <div className="settings-row">
                                            <div className="settings-row-copy">
                                                <span className="settings-row-label">
                                                    Require consecutive blocks
                                                </span>
                                                <span className="settings-row-hint">
                                                    Reset the count after a block at or above the demote threshold
                                                </span>
                                            </div>
                                            <div className="settings-toggle-host haptic-host">
                                                <button
                                                    type="button"
                                                    className={`settings-toggle${freePlayDemoteRequiresConsecutive ? ' is-on' : ''}`}
                                                    role="switch"
                                                    aria-checked={freePlayDemoteRequiresConsecutive}
                                                    aria-label="Require consecutive demotion blocks"
                                                    data-haptic="light"
                                                    onClick={() =>
                                                        setFreePlayDemoteRequiresConsecutive(
                                                            !freePlayDemoteRequiresConsecutive
                                                        )
                                                    }
                                                >
                                                    <span className="settings-toggle-knob" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

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

                        <div className="settings-row">
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Paced mode</span>
                                <span className="settings-row-hint">
                                    Freeze after each stimulus · Space or tap to continue
                                </span>
                            </div>
                            <div className="settings-toggle-host haptic-host">
                                <button
                                    type="button"
                                    className={`settings-toggle${stepwisePacing ? ' is-on' : ''}`}
                                    role="switch"
                                    aria-checked={stepwisePacing}
                                    aria-label="Paced mode"
                                    onClick={() => setStepwisePacing(!stepwisePacing)}
                                >
                                    <span className="settings-toggle-knob" />
                                </button>
                            </div>
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
                                        <span className="settings-row-hint">
                                            Easy avoids accidental near-misses · Off only skips planted ones
                                        </span>
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
                                          : 'Fixed matches per block (6+6 incl. 2 both at 20 scorable) · on by default'}
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
                            <div
                                className={`settings-row${pinCenterNoPosition ? ' is-disabled' : ''}`}
                            >
                                <div className="settings-row-copy">
                                    <span className="settings-row-label">Size</span>
                                    <span className="settings-row-hint">
                                        {pinCenterNoPosition
                                            ? 'Locked to 3×3 while Position is off'
                                            : '3×3 standard · 2×2 easier spatial load'}
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
                                                className={`segment-btn${
                                                    (pinCenterNoPosition ? '3x3' : positionGrid) ===
                                                    option.id
                                                        ? ' is-active'
                                                        : ''
                                                }`}
                                                data-haptic="light"
                                                aria-pressed={
                                                    (pinCenterNoPosition ? '3x3' : positionGrid) ===
                                                    option.id
                                                }
                                                aria-disabled={
                                                    pinCenterNoPosition && option.id === '2x2'
                                                }
                                                disabled={
                                                    pinCenterNoPosition && option.id === '2x2'
                                                }
                                                onClick={() => {
                                                    if (
                                                        pinCenterNoPosition &&
                                                        option.id === '2x2'
                                                    ) {
                                                        return;
                                                    }
                                                    setPositionGrid(option.id);
                                                }}
                                            >
                                                {option.label}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div
                            className={`settings-row${
                                isTwoByTwo || pinCenterNoPosition ? ' is-disabled' : ''
                            }`}
                        >
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Center cell</span>
                                <span className="settings-row-hint">
                                    {pinCenterNoPosition
                                        ? 'Always center when Position is off'
                                        : isTwoByTwo
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
                                    aria-disabled={isTwoByTwo || pinCenterNoPosition}
                                    disabled={isTwoByTwo || pinCenterNoPosition}
                                    onClick={() => {
                                        if (isTwoByTwo || pinCenterNoPosition) return;
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

                        <div
                            className={`settings-row${mode !== 'single' || singleModality !== 'position' ? ' is-disabled' : ''}`}
                        >
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Position recency</span>
                                <span className="settings-row-hint">
                                    Number each square by how many stimuli ago it last appeared
                                </span>
                            </div>
                            <div className="settings-toggle-host haptic-host">
                                <button
                                    type="button"
                                    className={`settings-toggle${showPositionRecency ? ' is-on' : ''}`}
                                    role="switch"
                                    aria-checked={showPositionRecency}
                                    aria-label="Position recency"
                                    disabled={mode !== 'single' || singleModality !== 'position'}
                                    onClick={() => setShowPositionRecency(!showPositionRecency)}
                                >
                                    <span className="settings-toggle-knob" />
                                </button>
                            </div>
                        </div>

                        <div className={`settings-row${!isFreePlay ? ' is-disabled' : ''}`}>
                            <div className="settings-row-copy">
                                <span className="settings-row-label">Rotating board</span>
                                <span className="settings-row-hint">
                                    {isFreePlay
                                        ? 'Now and then the board spins a quarter, half or three-quarter turn. Positions turn with it: match by place on the board, not on screen'
                                        : 'Free play only'}
                                </span>
                            </div>
                            <div className="settings-toggle-host haptic-host">
                                <button
                                    type="button"
                                    className={`settings-toggle${rotatingBoard ? ' is-on' : ''}`}
                                    role="switch"
                                    aria-checked={rotatingBoard}
                                    aria-label="Rotating board"
                                    disabled={!isFreePlay}
                                    onClick={() => setRotatingBoard(!rotatingBoard)}
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
                                    Green/red on press · misses still flash at trial end
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
                                <span className="settings-row-label">Profile</span>
                                <span className="settings-row-hint">
                                    Use the same profile on each device. Anyone with access to this site can select it.
                                </span>
                            </div>
                            {profiles.length > 0 && (
                                <div className="settings-profile-list" role="list" aria-label="Profiles">
                                    {profiles.map((profile) => (
                                        <button
                                            key={profile}
                                            type="button"
                                            className={`settings-profile-chip${loadProfile() === profile ? ' is-active' : ''}`}
                                            disabled={applyBusy}
                                            onClick={() => {
                                                setProfileDraft(profile);
                                                void onApplyProfile(profile);
                                            }}
                                        >
                                            {profile}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="settings-player-code">
                                <label className="visually-hidden" htmlFor={profileInputId}>
                                    Profile name
                                </label>
                                <input
                                    id={profileInputId}
                                    className="settings-player-code-input"
                                    type="text"
                                    autoComplete="off"
                                    spellCheck={false}
                                    minLength={1}
                                    maxLength={40}
                                    placeholder="New profile name"
                                    value={profileDraft}
                                    onChange={(e) => setProfileDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            void onApplyProfile();
                                        }
                                    }}
                                />
                                <div className="settings-player-code-actions haptic-host">
                                    <button
                                        type="button"
                                        className="settings-player-code-apply"
                                        data-haptic="light"
                                        disabled={applyBusy || profileDraft.trim().length < 1}
                                        onClick={() => void onApplyProfile()}
                                    >
                                        {applyBusy ? '…' : profiles.includes(profileDraft.trim()) ? 'Select' : 'Create'}
                                    </button>
                                </div>
                            </div>
                            <span
                                className={`settings-player-code-status${
                                    syncStatus.kind === 'error' || syncStatus.kind === 'conflict' ? ' is-error' : ''
                                }`}
                                role="status"
                            >
                                {syncStatusLabel(syncStatus)}
                            </span>
                            {syncStatus.kind === 'conflict' && (
                                <button type="button" className="settings-player-code-apply"
                                    disabled={applyBusy} onClick={() => void onUseCloudProgress()}>
                                    Use cloud version · discard unsynced changes here
                                </button>
                            )}
                        </div>
                    </SettingsSection>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
