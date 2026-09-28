import { AudioPackId } from './audioPacks';
import {
    ANSWER_GRACE_DEFAULT_MS,
    clampAnswerGraceMs,
    clampIsiMs,
    FREE_PLAY_DEFAULT_ISI_MAX_MS,
    FREE_PLAY_DEFAULT_ISI_MIN_MS,
} from './isi';
import {
    ModeId,
    ModalityId,
    getModalitiesForMode,
    normalizeSingleModality,
    normalizeTripleModalities,
} from './modalities';
import {
    clampVariableNHoldTrials,
    type VariableNHoldTrials,
} from './variableN';
import { isPositionGrid, type PositionGrid } from './positionGrid';
import {
    INTERFERENCE_OPTIONS,
    isInterferenceEasy,
    type InterferenceSetting,
} from './interference';
import {
    DEFAULT_DAILY_ROUNDS,
    DEFAULT_DAILY_SESSIONS,
} from './dailyProgress';
import {
    normalizeImageDifficulty,
    type ImageDifficulty,
} from './imageSet';

export const SETTINGS_STORAGE_KEY = 'nback-settings';
export const SETTINGS_SCHEMA_VERSION = 1 as const;

export const DEFAULT_FREE_PLAY_PROMOTE_PCT = 80;
/** Keep existing auto-progress behavior: demote below the former promotion threshold. */
export const DEFAULT_FREE_PLAY_DEMOTE_PCT = 80;
export const DEFAULT_FREE_PLAY_FAILS_TO_DEMOTE = 3;

/** Soft caps for daily goal steppers. */
export const MAX_DAILY_ROUNDS = 100;
export const MAX_DAILY_SESSIONS = 20;
export const MIN_FREE_PLAY_PROMOTE_PCT = 50;
export const MAX_FREE_PLAY_PROMOTE_PCT = 100;
export const MIN_FREE_PLAY_DEMOTE_PCT = 0;
export const MAX_FREE_PLAY_DEMOTE_PCT = 100;
export const MAX_FREE_PLAY_FAILS_TO_DEMOTE = 10;

export type PersistablePlayMode = 'free' | 'adaptive' | 'cyclic';

export const PERSISTABLE_INTERFERENCE_OPTIONS = INTERFERENCE_OPTIONS;

export type PersistableInterferenceChance = InterferenceSetting;

/** Trial settings subset synced to the server (no session-only lureStage). */
export interface PersistableSettings {
    version: typeof SETTINGS_SCHEMA_VERSION;
    level: number;
    trials: number;
    isiMin: number;
    isiMax: number;
    activeFeedback: boolean;
    displayTrials: boolean;
    displayTarget: boolean;
    allowCenterStimulus: boolean;
    /** Free-play spatial board; Adaptive/Cyclic always use 3×3 at runtime. */
    positionGrid: PositionGrid;
    /** Show current Variable N lag in the center square (only when center cell is off). */
    displayVariableNCenter: boolean;
    /** Extra claim time (ms) beyond ISI scoring window. */
    answerGraceMs: number;
    /** Paced mode: freeze the trial clock after each stimulus until Space/tap continues. */
    stepwisePacing: boolean;
    useFullScreen: boolean;
    mode: ModeId;
    /** The active stream in Single N-back. */
    singleModality: ModalityId;
    /** Play a short onset cue in Single N-back when Audio is not the stream. */
    singleStimulusBleep: boolean;
    /** Label spatial squares by how many stimuli ago they last appeared. */
    showPositionRecency: boolean;
    /** Free play: the board snaps round by quarter turns between some trials. */
    rotatingBoard: boolean;
    /** Which three modalities run when mode is Triple (ignored for Dual/Quad). */
    tripleModalities: ModalityId[];
    audioPack: AudioPackId;
    imageDifficulty: ImageDifficulty;
    interferenceChance: PersistableInterferenceChance;
    variableN: boolean;
    variableNHoldTrials: VariableNHoldTrials;
    playMode: PersistablePlayMode;
    useBlockQuotas: boolean;
    useJaeggiQuotas: boolean;
    /** Target rounds (blocks) per training day; 0 hides daily dots. */
    dailyRounds: number;
    /** Session groups for daily dots layout. */
    dailySessions: number;
    /** Free-play only: auto-adjust n from Match %. */
    freePlayAutoProgress: boolean;
    freePlayPromotePct: number;
    /** A block counts toward demotion only when Match % is below this threshold. */
    freePlayDemotePct: number;
    freePlayFailsToDemote: number;
    /** When false, intervening non-poor blocks do not reset the demotion counter. */
    freePlayDemoteRequiresConsecutive: boolean;
    /** Survives 04:00 day rollover; reset on manual level change. */
    freePlayFailStreak: number;
}

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

const MODE_IDS: ModeId[] = ['single', 'dual', 'triple', 'quad'];
const AUDIO_PACKS: AudioPackId[] = ['letters', 'piano'];

export function createDefaultPersistableSettings(): PersistableSettings {
    return {
        version: SETTINGS_SCHEMA_VERSION,
        level: 2,
        trials: 30,
        isiMin: FREE_PLAY_DEFAULT_ISI_MIN_MS,
        isiMax: FREE_PLAY_DEFAULT_ISI_MAX_MS,
        activeFeedback: false,
        displayTrials: true,
        displayTarget: true,
        allowCenterStimulus: false,
        positionGrid: '3x3',
        displayVariableNCenter: false,
        answerGraceMs: ANSWER_GRACE_DEFAULT_MS,
        stepwisePacing: false,
        useFullScreen: false,
        mode: 'dual',
        singleModality: 'position',
        singleStimulusBleep: false,
        showPositionRecency: false,
        rotatingBoard: false,
        tripleModalities: getModalitiesForMode('triple'),
        audioPack: 'letters',
        imageDifficulty: 'easy',
        interferenceChance: 0.125,
        variableN: false,
        variableNHoldTrials: 1,
        playMode: 'free',
        useBlockQuotas: false,
        useJaeggiQuotas: true,
        dailyRounds: DEFAULT_DAILY_ROUNDS,
        dailySessions: DEFAULT_DAILY_SESSIONS,
        freePlayAutoProgress: false,
        freePlayPromotePct: DEFAULT_FREE_PLAY_PROMOTE_PCT,
        freePlayDemotePct: DEFAULT_FREE_PLAY_DEMOTE_PCT,
        freePlayFailsToDemote: DEFAULT_FREE_PLAY_FAILS_TO_DEMOTE,
        freePlayDemoteRequiresConsecutive: true,
        freePlayFailStreak: 0,
    };
}

export function clampDailyRounds(value: unknown, fallback = DEFAULT_DAILY_ROUNDS): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(0, Math.min(MAX_DAILY_ROUNDS, Math.floor(value)));
}

export function clampDailySessions(value: unknown, fallback = DEFAULT_DAILY_SESSIONS): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(1, Math.min(MAX_DAILY_SESSIONS, Math.floor(value)));
}

export function clampFreePlayPromotePct(
    value: unknown,
    fallback = DEFAULT_FREE_PLAY_PROMOTE_PCT
): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(
        MIN_FREE_PLAY_PROMOTE_PCT,
        Math.min(MAX_FREE_PLAY_PROMOTE_PCT, Math.round(value))
    );
}

export function clampFreePlayDemotePct(
    value: unknown,
    fallback = DEFAULT_FREE_PLAY_DEMOTE_PCT
): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(
        MIN_FREE_PLAY_DEMOTE_PCT,
        Math.min(MAX_FREE_PLAY_DEMOTE_PCT, Math.round(value))
    );
}

export function clampFreePlayFailsToDemote(
    value: unknown,
    fallback = DEFAULT_FREE_PLAY_FAILS_TO_DEMOTE
): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(1, Math.min(MAX_FREE_PLAY_FAILS_TO_DEMOTE, Math.floor(value)));
}

function asInterferenceChance(value: unknown): PersistableInterferenceChance {
    const defaults = createDefaultPersistableSettings();
    if (isInterferenceEasy(value)) return 'easy';
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return defaults.interferenceChance;
    }
    const match = PERSISTABLE_INTERFERENCE_OPTIONS.find((option) => option === value);
    return match ?? defaults.interferenceChance;
}

function asMode(value: unknown): ModeId {
    if (typeof value === 'string' && (MODE_IDS as string[]).includes(value)) {
        return value as ModeId;
    }
    return 'dual';
}

function asAudioPack(value: unknown): AudioPackId {
    if (typeof value === 'string' && (AUDIO_PACKS as string[]).includes(value)) {
        return value as AudioPackId;
    }
    return 'letters';
}

function asPlayMode(value: unknown): PersistablePlayMode {
    if (value === 'adaptive' || value === 'cyclic') return value;
    return 'free';
}

function asPositiveInt(value: unknown, fallback: number, min = 1): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.max(min, Math.floor(value));
}

/** Normalize unknown JSON into a persistable settings object. */
export function normalizePersistableSettings(raw: unknown): PersistableSettings {
    const defaults = createDefaultPersistableSettings();
    if (raw == null || typeof raw !== 'object') {
        return defaults;
    }
    const obj = raw as Record<string, unknown>;
    const isiMin = clampIsiMs(
        typeof obj.isiMin === 'number' && Number.isFinite(obj.isiMin)
            ? obj.isiMin
            : defaults.isiMin
    );
    const isiMaxRaw =
        typeof obj.isiMax === 'number' && Number.isFinite(obj.isiMax)
            ? obj.isiMax
            : defaults.isiMax;
    const isiMax = Math.max(isiMin, clampIsiMs(isiMaxRaw));
    const level = asPositiveInt(obj.level, defaults.level);
    // Floor at `level` (warm-up length), not `level * 2`, so Free-play auto-promote
    // can raise n without forcing a trials bump through persist/reload (R12).
    const trials = Math.max(level, asPositiveInt(obj.trials, defaults.trials));

    return {
        version: SETTINGS_SCHEMA_VERSION,
        level,
        trials,
        isiMin,
        isiMax,
        activeFeedback:
            typeof obj.activeFeedback === 'boolean'
                ? obj.activeFeedback
                : defaults.activeFeedback,
        displayTrials:
            typeof obj.displayTrials === 'boolean'
                ? obj.displayTrials
                : defaults.displayTrials,
        displayTarget:
            typeof obj.displayTarget === 'boolean'
                ? obj.displayTarget
                : defaults.displayTarget,
        allowCenterStimulus:
            typeof obj.allowCenterStimulus === 'boolean'
                ? obj.allowCenterStimulus
                : defaults.allowCenterStimulus,
        positionGrid: isPositionGrid(obj.positionGrid) ? obj.positionGrid : defaults.positionGrid,
        displayVariableNCenter: (() => {
            const grid = isPositionGrid(obj.positionGrid)
                ? obj.positionGrid
                : defaults.positionGrid;
            if (grid === '2x2') return false;
            const allowCenter =
                typeof obj.allowCenterStimulus === 'boolean'
                    ? obj.allowCenterStimulus
                    : defaults.allowCenterStimulus;
            const requested =
                typeof obj.displayVariableNCenter === 'boolean'
                    ? obj.displayVariableNCenter
                    : defaults.displayVariableNCenter;
            // Center-cell stimuli and a center N digit cannot share the middle square.
            return allowCenter ? false : requested;
        })(),
        answerGraceMs: clampAnswerGraceMs(
            typeof obj.answerGraceMs === 'number' && Number.isFinite(obj.answerGraceMs)
                ? obj.answerGraceMs
                : defaults.answerGraceMs
        ),
        stepwisePacing:
            typeof obj.stepwisePacing === 'boolean'
                ? obj.stepwisePacing
                : defaults.stepwisePacing,
        useFullScreen:
            typeof obj.useFullScreen === 'boolean'
                ? obj.useFullScreen
                : defaults.useFullScreen,
        mode: asMode(obj.mode),
        singleModality: normalizeSingleModality(obj.singleModality),
        singleStimulusBleep:
            typeof obj.singleStimulusBleep === 'boolean'
                ? obj.singleStimulusBleep
                : defaults.singleStimulusBleep,
        showPositionRecency:
            typeof obj.showPositionRecency === 'boolean'
                ? obj.showPositionRecency
                : defaults.showPositionRecency,
        rotatingBoard:
            typeof obj.rotatingBoard === 'boolean'
                ? obj.rotatingBoard
                : defaults.rotatingBoard,
        tripleModalities: normalizeTripleModalities(obj.tripleModalities),
        audioPack: asAudioPack(obj.audioPack),
        imageDifficulty: normalizeImageDifficulty(obj.imageDifficulty),
        interferenceChance: asInterferenceChance(obj.interferenceChance),
        variableN: typeof obj.variableN === 'boolean' ? obj.variableN : defaults.variableN,
        variableNHoldTrials: clampVariableNHoldTrials(
            typeof obj.variableNHoldTrials === 'number' &&
                Number.isFinite(obj.variableNHoldTrials)
                ? obj.variableNHoldTrials
                : defaults.variableNHoldTrials
        ),
        playMode: asPlayMode(obj.playMode),
        useBlockQuotas:
            typeof obj.useBlockQuotas === 'boolean'
                ? obj.useBlockQuotas
                : defaults.useBlockQuotas,
        useJaeggiQuotas:
            typeof obj.useJaeggiQuotas === 'boolean'
                ? obj.useJaeggiQuotas
                : defaults.useJaeggiQuotas,
        dailyRounds: clampDailyRounds(obj.dailyRounds, defaults.dailyRounds),
        dailySessions: clampDailySessions(obj.dailySessions, defaults.dailySessions),
        freePlayAutoProgress:
            typeof obj.freePlayAutoProgress === 'boolean'
                ? obj.freePlayAutoProgress
                : defaults.freePlayAutoProgress,
        freePlayPromotePct: clampFreePlayPromotePct(
            obj.freePlayPromotePct,
            defaults.freePlayPromotePct
        ),
        freePlayDemotePct: clampFreePlayDemotePct(
            obj.freePlayDemotePct,
            defaults.freePlayDemotePct
        ),
        freePlayFailsToDemote: clampFreePlayFailsToDemote(
            obj.freePlayFailsToDemote,
            defaults.freePlayFailsToDemote
        ),
        freePlayDemoteRequiresConsecutive:
            typeof obj.freePlayDemoteRequiresConsecutive === 'boolean'
                ? obj.freePlayDemoteRequiresConsecutive
                : defaults.freePlayDemoteRequiresConsecutive,
        freePlayFailStreak:
            typeof obj.freePlayFailStreak === 'number' && Number.isFinite(obj.freePlayFailStreak)
                ? Math.max(0, Math.floor(obj.freePlayFailStreak))
                : defaults.freePlayFailStreak,
    };
}

export function parsePersistableSettings(raw: string): PersistableSettings {
    try {
        return normalizePersistableSettings(JSON.parse(raw) as unknown);
    } catch {
        return createDefaultPersistableSettings();
    }
}

/**
 * Strip session-only fields and wrap store settings for persistence.
 * Accepts a partial/loose object so callers need not import GameStore types.
 */
export function persistableSettingsFromStoreSettings(
    settings: Record<string, unknown>
): PersistableSettings {
    const { lureStage: _lure, ...rest } = settings;
    return normalizePersistableSettings(rest);
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
    if (storage != null) {
        return storage;
    }
    if (typeof globalThis.localStorage !== 'undefined') {
        return globalThis.localStorage;
    }
    return null;
}

export function loadSettings(storage?: StorageLike): PersistableSettings {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return createDefaultPersistableSettings();
    }
    const raw = resolved.getItem(SETTINGS_STORAGE_KEY);
    if (raw == null || raw === '') {
        return createDefaultPersistableSettings();
    }
    return parsePersistableSettings(raw);
}

export function saveSettings(data: PersistableSettings, storage?: StorageLike): void {
    const resolved = resolveStorage(storage);
    if (resolved == null) {
        return;
    }
    try {
        resolved.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data));
    } catch {
        // localStorage quota / privacy mode — fail silently.
    }
}
