import {
    ADAPTIVE_LADDER_SCHEMA_VERSION,
    CYCLIC_LADDER_SCHEMA_VERSION,
    loadAdaptiveLadder,
    loadCyclicLadder,
    saveAdaptiveLadder,
    saveCyclicLadder,
} from '../model/ladderPersistence';
import {
    loadPlayerCode,
    normalizePlayerCode,
    savePlayerCode,
    validatePlayerCode,
} from '../model/playerCode';
import {
    normalizeProgressDocument,
    progressDocumentFromParts,
    type ProgressDocumentV1,
} from '../model/progressDocument';
import {
    loadSettings,
    persistableSettingsFromStoreSettings,
    saveSettings,
    type PersistableSettings,
} from '../model/settingsPersistence';
import { loadUiPreferences, saveUiPreferences } from '../model/uiPreferences';
import { Speech } from '../model/Speech';
import { getModalitiesForMode, type ModalityId } from '../model/modalities';
import { ButtonState } from '../model/enums/buttonState';
import { useGameStore } from '../store/gameStore';
import {
    isProgressDirty,
    readLastSyncedAt,
    setProgressDirty,
    writeLastSyncedAt,
} from './localFlags';
import { setProgressPushHandler } from './pushQueue';

export type SyncStatus =
    | { kind: 'not_linked' }
    | { kind: 'linking' }
    | { kind: 'linked'; lastSyncedAt: string | null }
    | { kind: 'syncing'; lastSyncedAt: string | null }
    | { kind: 'error'; message: string; lastSyncedAt: string | null };

type Listener = () => void;

let status: SyncStatus = { kind: 'not_linked' };
const listeners = new Set<Listener>();
let bootstrapped = false;

function createEmptyButtons(
    modalities: ModalityId[]
): Partial<Record<ModalityId, `${ButtonState}`>> {
    const btns: Partial<Record<ModalityId, `${ButtonState}`>> = {};
    for (const modality of modalities) {
        btns[modality] = ButtonState.None;
    }
    return btns;
}

function emitStatus(next: SyncStatus): void {
    status = next;
    for (const listener of listeners) {
        listener();
    }
}

export function getSyncStatus(): SyncStatus {
    return status;
}

export function subscribeSyncStatus(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function refreshLinkedStatus(): void {
    const code = loadPlayerCode();
    if (code == null) {
        emitStatus({ kind: 'not_linked' });
        return;
    }
    emitStatus({ kind: 'linked', lastSyncedAt: readLastSyncedAt() });
}

function collectLocalProgress(): ProgressDocumentV1 {
    return progressDocumentFromParts({
        ladder: loadAdaptiveLadder(),
        cyclicLadder: loadCyclicLadder(),
        settings: loadSettings(),
        uiPreferences: loadUiPreferences(),
    });
}

function authHeaders(code: string): HeadersInit {
    return {
        Authorization: `Bearer ${code}`,
        'Content-Type': 'application/json',
    };
}

async function fetchProgress(code: string): Promise<Response> {
    return fetch('/api/progress', {
        method: 'GET',
        headers: authHeaders(code),
    });
}

async function putProgress(code: string, doc: ProgressDocumentV1): Promise<Response> {
    return fetch('/api/progress', {
        method: 'PUT',
        headers: authHeaders(code),
        body: JSON.stringify(doc),
    });
}

function hydrateStoreFromDocument(doc: ProgressDocumentV1): void {
    saveAdaptiveLadder(doc.ladder);
    saveCyclicLadder(doc.cyclicLadder);
    saveSettings(doc.settings);
    saveUiPreferences(doc.uiPreferences);

    const settings = doc.settings;
    const modalities = getModalitiesForMode(settings.mode);
    useGameStore.setState({
        ladder: doc.ladder.byMode,
        cyclicLadder: doc.cyclicLadder.byMode,
        settings: {
            level: settings.level,
            trials: settings.trials,
            isiMin: settings.isiMin,
            isiMax: settings.isiMax,
            activeFeedback: settings.activeFeedback,
            displayTrials: settings.displayTrials,
            displayTarget: settings.displayTarget,
            allowCenterStimulus: settings.allowCenterStimulus,
            positionGrid: settings.positionGrid,
            displayVariableNCenter: settings.displayVariableNCenter,
            answerGraceMs: settings.answerGraceMs,
            useFullScreen: settings.useFullScreen,
            mode: settings.mode,
            audioPack: settings.audioPack,
            interferenceChance: settings.interferenceChance,
            variableN: settings.variableN,
            variableNHoldTrials: settings.variableNHoldTrials,
            playMode: settings.playMode,
            useBlockQuotas: settings.useBlockQuotas,
            useJaeggiQuotas: settings.useJaeggiQuotas,
        },
        activeModalities: modalities,
        btns: createEmptyButtons(modalities),
        speech: new Speech(settings.audioPack),
    });
}

export function persistSettingsFromStore(): PersistableSettings {
    const settings = useGameStore.getState().settings as unknown as Record<string, unknown>;
    const persistable = persistableSettingsFromStoreSettings(settings);
    saveSettings(persistable);
    return persistable;
}

async function readErrorMessage(res: Response): Promise<string> {
    try {
        const body = (await res.json()) as { error?: string };
        if (typeof body.error === 'string' && body.error !== '') {
            return body.error;
        }
    } catch {
        // ignore
    }
    return `Sync failed (${res.status})`;
}

export async function pushProgress(): Promise<void> {
    const code = loadPlayerCode();
    if (code == null) {
        return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setProgressDirty(true);
        return;
    }

    const lastSyncedAt = readLastSyncedAt();
    emitStatus({ kind: 'syncing', lastSyncedAt });

    try {
        // Ensure settings cache matches the live store before upload.
        persistSettingsFromStore();
        saveAdaptiveLadder({
            version: ADAPTIVE_LADDER_SCHEMA_VERSION,
            byMode: useGameStore.getState().ladder,
        });
        saveCyclicLadder({
            version: CYCLIC_LADDER_SCHEMA_VERSION,
            byMode: useGameStore.getState().cyclicLadder,
        });

        const doc = collectLocalProgress();
        const res = await putProgress(code, doc);
        if (!res.ok) {
            const message = await readErrorMessage(res);
            emitStatus({ kind: 'error', message, lastSyncedAt });
            return;
        }
        const body = normalizeProgressDocument(await res.json());
        writeLastSyncedAt(body.updatedAt);
        setProgressDirty(false);
        emitStatus({ kind: 'linked', lastSyncedAt: body.updatedAt });
    } catch {
        setProgressDirty(true);
        emitStatus({
            kind: 'error',
            message: 'Could not reach the server',
            lastSyncedAt,
        });
    }
}

/**
 * Apply a user-typed player code: load existing cloud save, or seed from local.
 */
export async function applyPlayerCode(rawCode: string): Promise<void> {
    const code = normalizePlayerCode(rawCode);
    const validationError = validatePlayerCode(code);
    if (validationError != null) {
        emitStatus({
            kind: 'error',
            message: validationError,
            lastSyncedAt: readLastSyncedAt(),
        });
        throw new Error(validationError);
    }

    emitStatus({ kind: 'linking' });

    try {
        const getRes = await fetchProgress(code);
        if (getRes.status === 404) {
            savePlayerCode(code);
            persistSettingsFromStore();
            saveAdaptiveLadder({
                version: ADAPTIVE_LADDER_SCHEMA_VERSION,
                byMode: useGameStore.getState().ladder,
            });
            saveCyclicLadder({
                version: CYCLIC_LADDER_SCHEMA_VERSION,
                byMode: useGameStore.getState().cyclicLadder,
            });
            const seed = collectLocalProgress();
            const putRes = await putProgress(code, seed);
            if (!putRes.ok) {
                const message = await readErrorMessage(putRes);
                emitStatus({ kind: 'error', message, lastSyncedAt: null });
                throw new Error(message);
            }
            const body = normalizeProgressDocument(await putRes.json());
            writeLastSyncedAt(body.updatedAt);
            setProgressDirty(false);
            emitStatus({ kind: 'linked', lastSyncedAt: body.updatedAt });
            return;
        }

        if (!getRes.ok) {
            const message = await readErrorMessage(getRes);
            emitStatus({ kind: 'error', message, lastSyncedAt: readLastSyncedAt() });
            throw new Error(message);
        }

        const doc = normalizeProgressDocument(await getRes.json());
        savePlayerCode(code);
        hydrateStoreFromDocument(doc);
        writeLastSyncedAt(doc.updatedAt);
        setProgressDirty(false);
        emitStatus({ kind: 'linked', lastSyncedAt: doc.updatedAt });
    } catch (error) {
        if (status.kind !== 'error') {
            emitStatus({
                kind: 'error',
                message: error instanceof Error ? error.message : 'Could not apply player code',
                lastSyncedAt: readLastSyncedAt(),
            });
        }
        throw error;
    }
}

/** Pull if linked and server is newer; flush dirty local first. */
export async function pullIfNewer(): Promise<void> {
    const code = loadPlayerCode();
    if (code == null) {
        emitStatus({ kind: 'not_linked' });
        return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        refreshLinkedStatus();
        return;
    }

    if (isProgressDirty()) {
        await pushProgress();
        return;
    }

    const lastSyncedAt = readLastSyncedAt();
    emitStatus({ kind: 'syncing', lastSyncedAt });

    try {
        const res = await fetchProgress(code);
        if (res.status === 404) {
            await pushProgress();
            return;
        }
        if (!res.ok) {
            const message = await readErrorMessage(res);
            emitStatus({ kind: 'error', message, lastSyncedAt });
            return;
        }
        const doc = normalizeProgressDocument(await res.json());
        const serverUpdated = Date.parse(doc.updatedAt);
        const last = lastSyncedAt != null ? Date.parse(lastSyncedAt) : 0;

        if (Number.isFinite(serverUpdated) && serverUpdated > (Number.isFinite(last) ? last : 0)) {
            hydrateStoreFromDocument(doc);
            writeLastSyncedAt(doc.updatedAt);
        }
        setProgressDirty(false);
        emitStatus({ kind: 'linked', lastSyncedAt: readLastSyncedAt() ?? doc.updatedAt });
    } catch {
        emitStatus({
            kind: 'error',
            message: 'Could not reach the server',
            lastSyncedAt,
        });
    }
}

export function initProgressSync(): void {
    if (bootstrapped) {
        return;
    }
    bootstrapped = true;

    setProgressPushHandler(() => {
        void pushProgress();
    });

    refreshLinkedStatus();

    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
            if (isProgressDirty()) {
                void pushProgress();
            } else {
                void pullIfNewer();
            }
        });
    }

    void pullIfNewer();
}
