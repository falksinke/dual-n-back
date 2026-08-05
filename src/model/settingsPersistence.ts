import { AudioPackId } from './audioPacks';
import {
    ANSWER_GRACE_DEFAULT_MS,
    clampAnswerGraceMs,
    clampIsiMs,
    FREE_PLAY_DEFAULT_ISI_MAX_MS,
    FREE_PLAY_DEFAULT_ISI_MIN_MS,
} from './isi';
import { ModeId } from './modalities';
import {
    clampVariableNHoldTrials,
    type VariableNHoldTrials,
} from './variableN';
import { isPositionGrid, type PositionGrid } from './positionGrid';

export const SETTINGS_STORAGE_KEY = 'nback-settings';
export const SETTINGS_SCHEMA_VERSION = 1 as const;

export type PersistablePlayMode = 'free' | 'adaptive' | 'cyclic';

export const PERSISTABLE_INTERFERENCE_OPTIONS = [
    0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1,
] as const;

export type PersistableInterferenceChance =
    (typeof PERSISTABLE_INTERFERENCE_OPTIONS)[number];

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
    useFullScreen: boolean;
    mode: ModeId;
    audioPack: AudioPackId;
    interferenceChance: PersistableInterferenceChance;
    variableN: boolean;
    variableNHoldTrials: VariableNHoldTrials;
    playMode: PersistablePlayMode;
    useBlockQuotas: boolean;
    useJaeggiQuotas: boolean;
}

export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

const MODE_IDS: ModeId[] = ['dual', 'triple', 'quad'];
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
        useFullScreen: false,
        mode: 'dual',
        audioPack: 'letters',
        interferenceChance: 0.125,
        variableN: false,
        variableNHoldTrials: 1,
        playMode: 'free',
        useBlockQuotas: false,
        useJaeggiQuotas: true,
    };
}

function asInterferenceChance(value: unknown): PersistableInterferenceChance {
    const defaults = createDefaultPersistableSettings();
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
    const trials = Math.max(level * 2, asPositiveInt(obj.trials, defaults.trials));

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
        useFullScreen:
            typeof obj.useFullScreen === 'boolean'
                ? obj.useFullScreen
                : defaults.useFullScreen,
        mode: asMode(obj.mode),
        audioPack: asAudioPack(obj.audioPack),
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
