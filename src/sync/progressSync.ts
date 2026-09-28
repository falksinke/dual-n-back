import {
    ADAPTIVE_LADDER_SCHEMA_VERSION,
    CYCLIC_LADDER_SCHEMA_VERSION,
    loadAdaptiveLadder,
    loadCyclicLadder,
    saveAdaptiveLadder,
    saveCyclicLadder,
} from '../model/ladderPersistence';
import {
    loadProfile,
    normalizeProfileName,
    saveProfile,
    validateProfileName,
} from '../model/profile';
import { loadPlayerCode } from '../model/playerCode';
import {
    loadFireflyProgress,
    newerFireflyProgress,
    saveFireflyProgress,
} from '../model/fireflyProgress';
import {
    createDefaultProgressDocument,
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
import { clampCompletedToGoal } from '../model/dailyProgress';
import {
    loadDailyProgress,
    saveDailyProgress,
    type DailyProgressV1,
} from '../model/dailyProgress';
import {
    loadStatisticsHistory,
    MAX_STATISTICS_ROUNDS,
    STATISTICS_STORAGE_KEY,
    type StatisticsHistory,
} from '../model/statistics';
import { loadUiPreferences, saveUiPreferences } from '../model/uiPreferences';
import { Speech } from '../model/Speech';
import { resolveModalities, type ModalityId } from '../model/modalities';
import { ButtonState } from '../model/enums/buttonState';
import { useGameStore } from '../store/gameStore';
import {
    isProgressDirty,
    readLastSyncedAt,
    setProgressDirty,
    writeLastSyncedAt,
} from './localFlags';
import { scheduleProgressPush, setProgressPushHandler } from './pushQueue';
import { getLocalChangeSerial } from './noteLocal';

export type SyncStatus =
    | { kind: 'not_linked' }
    | { kind: 'linking' }
    | { kind: 'linked'; lastSyncedAt: string | null }
    | { kind: 'syncing'; lastSyncedAt: string | null }
    | { kind: 'conflict'; message: string; lastSyncedAt: string | null }
    | { kind: 'error'; message: string; lastSyncedAt: string | null };

class ProgressConflictError extends Error {}

type Listener = () => void;

let status: SyncStatus = { kind: 'not_linked' };
const listeners = new Set<Listener>();
let bootstrapped = false;
let profileSelectionGeneration = 0;
let pushInFlight: Promise<void> | null = null;

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
    const code = loadProfile();
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
        statistics: loadStatisticsHistory(),
        dailyProgress: loadDailyProgress(),
        fireflyPost: loadFireflyProgress(loadProfile()),
    });
}

function mergeStatistics(
    local: StatisticsHistory,
    remote: StatisticsHistory
): StatisticsHistory {
    const byId = new Map(remote.rounds.map((round) => [round.id, round]));
    for (const round of local.rounds) byId.set(round.id, round);
    return {
        version: local.version,
        rounds: [...byId.values()]
            .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
            .slice(-MAX_STATISTICS_ROUNDS),
    };
}

function mergeDailyProgress(local: DailyProgressV1, remote: DailyProgressV1): DailyProgressV1 {
    if (local.dayKey !== remote.dayKey) {
        return local.dayKey > remote.dayKey ? local : remote;
    }
    return {
        ...remote,
        completedCount: Math.max(local.completedCount, remote.completedCount),
    };
}

function mergeLocalActivity(doc: ProgressDocumentV1): ProgressDocumentV1 {
    return {
        ...doc,
        statistics: mergeStatistics(loadStatisticsHistory(), doc.statistics),
        dailyProgress: mergeDailyProgress(loadDailyProgress(), doc.dailyProgress),
    };
}

function authHeaders(code: string): Record<string, string> {
    return {
        'X-Profile-Name': code,
        'Content-Type': 'application/json',
    };
}

async function fetchProgress(code: string): Promise<Response> {
    return fetch('/api/progress', {
        method: 'GET',
        headers: authHeaders(code),
    });
}

export async function listProfiles(): Promise<string[]> {
    const response = await fetch('/api/progress', { method: 'GET' });
    if (!response.ok) throw new Error(await readErrorMessage(response));
    const body = (await response.json()) as { profiles?: unknown };
    return Array.isArray(body.profiles)
        ? body.profiles.filter((profile): profile is string => typeof profile === 'string')
        : [];
}

async function putProgress(code: string, doc: ProgressDocumentV1, revision: number): Promise<Response> {
    return fetch('/api/progress', {
        method: 'PUT',
        headers: { ...authHeaders(code), 'If-Match': String(revision) },
        body: JSON.stringify(doc),
    });
}

function hydrateStoreFromDocument(doc: ProgressDocumentV1): void {
    saveAdaptiveLadder(doc.ladder);
    saveCyclicLadder(doc.cyclicLadder);
    saveSettings(doc.settings);
    saveUiPreferences(doc.uiPreferences);
    localStorage.setItem(STATISTICS_STORAGE_KEY, JSON.stringify(doc.statistics));
    saveDailyProgress(doc.dailyProgress);
    saveFireflyProgress(loadProfile(), doc.fireflyPost, true);

    const settings = doc.settings;
    const modalities = resolveModalities(
        settings.mode,
        settings.tripleModalities,
        settings.singleModality
    );
    const dailyProgress = clampCompletedToGoal(settings.dailyRounds);
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
            stepwisePacing: settings.stepwisePacing,
            useFullScreen: settings.useFullScreen,
            mode: settings.mode,
            singleModality: settings.singleModality,
            singleStimulusBleep: settings.singleStimulusBleep,
            showPositionRecency: settings.showPositionRecency,
            rotatingBoard: settings.rotatingBoard,
            tripleModalities: settings.tripleModalities,
            audioPack: settings.audioPack,
            imageDifficulty: settings.imageDifficulty,
            interferenceChance: settings.interferenceChance,
            variableN: settings.variableN,
            variableNHoldTrials: settings.variableNHoldTrials,
            playMode: settings.playMode,
            useBlockQuotas: settings.useBlockQuotas,
            useJaeggiQuotas: settings.useJaeggiQuotas,
            dailyRounds: settings.dailyRounds,
            dailySessions: settings.dailySessions,
            freePlayAutoProgress: settings.freePlayAutoProgress,
            freePlayPromotePct: settings.freePlayPromotePct,
            freePlayDemotePct: settings.freePlayDemotePct,
            freePlayFailsToDemote: settings.freePlayFailsToDemote,
            freePlayDemoteRequiresConsecutive: settings.freePlayDemoteRequiresConsecutive,
            freePlayFailStreak: settings.freePlayFailStreak,
        },
        dailyProgress,
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

async function pushProgressOnce(): Promise<void> {
    const code = loadProfile();
    if (code == null) {
        return;
    }
    const startSerial = getLocalChangeSerial();
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

        let doc = collectLocalProgress();
        const remoteResponse = await fetchProgress(code);
        let revision = 0;
        if (remoteResponse.ok) {
            revision = Number(remoteResponse.headers.get('X-Progress-Revision'));
            if (!Number.isSafeInteger(revision) || revision < 0) {
                throw new Error('Progress revision was missing');
            }
            const remoteOriginal = normalizeProgressDocument(await remoteResponse.json());
            const remote = mergeLocalActivity(remoteOriginal);
            const remoteTime = Date.parse(remote.updatedAt);
            const lastTime = lastSyncedAt == null ? 0 : Date.parse(lastSyncedAt);
            if (Number.isFinite(remoteTime) && remoteTime > (Number.isFinite(lastTime) ? lastTime : 0)) {
                const localContent = { ...doc, updatedAt: '' };
                const remoteContent = { ...remoteOriginal, updatedAt: '' };
                if (getLocalChangeSerial() === startSerial
                    && JSON.stringify(localContent) === JSON.stringify(remoteContent)) {
                    writeLastSyncedAt(remote.updatedAt);
                    setProgressDirty(false);
                    emitStatus({ kind: 'linked', lastSyncedAt: remote.updatedAt });
                    return;
                }
                throw new ProgressConflictError('This profile changed on another device. Local changes were not uploaded.');
            }
            doc = {
                ...doc,
                statistics: remote.statistics,
                dailyProgress: remote.dailyProgress,
                fireflyPost: newerFireflyProgress(doc.fireflyPost, remote.fireflyPost),
            };
        } else if (remoteResponse.status !== 404) {
            // Without the latest profile document, a PUT could erase another device's checkpoint.
            throw new Error(await readErrorMessage(remoteResponse));
        }
        const res = await putProgress(code, doc, revision);
        if (res.status === 409) {
            throw new ProgressConflictError(await readErrorMessage(res));
        }
        if (!res.ok) {
            if (loadProfile() !== code) return;
            const message = await readErrorMessage(res);
            emitStatus({ kind: 'error', message, lastSyncedAt });
            return;
        }
        if (loadProfile() !== code) return;
        const body = normalizeProgressDocument(await res.json());
        const latestFirefly = loadFireflyProgress(code);
        const mergedFirefly = newerFireflyProgress(latestFirefly, body.fireflyPost);
        const fireflyChangedDuringPush = mergedFirefly === latestFirefly
            && latestFirefly.updatedAt !== body.fireflyPost.updatedAt;
        saveFireflyProgress(code, mergedFirefly, true);
        if (fireflyChangedDuringPush || getLocalChangeSerial() !== startSerial) {
            setProgressDirty(true);
            scheduleProgressPush();
        } else {
            setProgressDirty(false);
        }
        writeLastSyncedAt(body.updatedAt);
        emitStatus({ kind: 'linked', lastSyncedAt: body.updatedAt });
    } catch (error) {
        if (loadProfile() !== code) return;
        setProgressDirty(true);
        emitStatus({
            kind: error instanceof ProgressConflictError ? 'conflict' : 'error',
            message: error instanceof Error ? error.message : 'Could not reach the server',
            lastSyncedAt,
        });
    }
}

export function pushProgress(): Promise<void> {
    if (pushInFlight) return pushInFlight;
    const active = pushProgressOnce();
    pushInFlight = active.finally(() => { pushInFlight = null; });
    return pushInFlight;
}

/**
 * Select or create a named profile: load existing cloud save, or seed from local.
 */
export async function applyProfile(rawProfile: string): Promise<void> {
    const code = normalizeProfileName(rawProfile);
    const previousProfile = loadProfile();
    const selectionGeneration = ++profileSelectionGeneration;
    const validationError = validateProfileName(code);
    if (validationError != null) {
        emitStatus({
            kind: 'error',
            message: validationError,
            lastSyncedAt: readLastSyncedAt(),
        });
        throw new Error(validationError);
    }
    if (previousProfile?.toLocaleLowerCase('en-US') === code.toLocaleLowerCase('en-US')) {
        if (isProgressDirty()) scheduleProgressPush();
        else refreshLinkedStatus();
        return;
    }

    try {
        if (pushInFlight) await pushInFlight;
        if (previousProfile != null && previousProfile !== code && isProgressDirty()) {
            await pushProgress();
            if (selectionGeneration !== profileSelectionGeneration) return;
            if (isProgressDirty()) await pushProgress();
            if (isProgressDirty()) throw new Error('Could not save the current profile before switching');
        }
        emitStatus({ kind: 'linking' });
        const getRes = await fetchProgress(code);
        if (selectionGeneration !== profileSelectionGeneration) return;
        if (getRes.status === 404) {
            const existingTargetFirefly = loadFireflyProgress(code);
            const seedFirefly = existingTargetFirefly.updatedAt == null
                ? previousProfile == null ? loadFireflyProgress(null)
                    : existingTargetFirefly : existingTargetFirefly;
            let seed = createDefaultProgressDocument();
            if (previousProfile == null) {
                persistSettingsFromStore();
                saveAdaptiveLadder({ version: ADAPTIVE_LADDER_SCHEMA_VERSION,
                    byMode: useGameStore.getState().ladder });
                saveCyclicLadder({ version: CYCLIC_LADDER_SCHEMA_VERSION,
                    byMode: useGameStore.getState().cyclicLadder });
                seed = collectLocalProgress();
                const legacyCode = loadPlayerCode();
                if (legacyCode != null) {
                    const legacyRes = await fetch('/api/progress', {
                        headers: { Authorization: `Bearer ${legacyCode}` },
                    });
                    if (legacyRes.ok && !isProgressDirty()) {
                        seed = mergeLocalActivity(normalizeProgressDocument(await legacyRes.json()));
                    } else if (!legacyRes.ok && legacyRes.status !== 404) {
                        throw new Error(await readErrorMessage(legacyRes));
                    }
                }
            }
            seed.fireflyPost = seedFirefly;
            if (selectionGeneration !== profileSelectionGeneration) return;
            const putRes = await putProgress(code, seed, 0);
            if (selectionGeneration !== profileSelectionGeneration) return;
            if (!putRes.ok) {
                const message = await readErrorMessage(putRes);
                emitStatus({ kind: 'error', message, lastSyncedAt: null });
                throw new Error(message);
            }
            const body = normalizeProgressDocument(await putRes.json());
            saveProfile(code);
            hydrateStoreFromDocument(body);
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

        const remoteDoc = normalizeProgressDocument(await getRes.json());
        if (selectionGeneration !== profileSelectionGeneration) return;
        const doc = previousProfile === code
            ? mergeLocalActivity(remoteDoc) : remoteDoc;
        const targetFirefly = loadFireflyProgress(code);
        const localFirefly = targetFirefly;
        doc.fireflyPost = newerFireflyProgress(localFirefly, remoteDoc.fireflyPost);
        const localFireflyIsNewer = doc.fireflyPost === localFirefly
            && localFirefly.updatedAt !== remoteDoc.fireflyPost.updatedAt;
        saveProfile(code);
        hydrateStoreFromDocument(doc);
        writeLastSyncedAt(doc.updatedAt);
        setProgressDirty(localFireflyIsNewer);
        if (localFireflyIsNewer) scheduleProgressPush();
        emitStatus({ kind: 'linked', lastSyncedAt: doc.updatedAt });
    } catch (error) {
        if (selectionGeneration !== profileSelectionGeneration) return;
        if (status.kind !== 'error' && status.kind !== 'conflict') {
            emitStatus({
                kind: 'error',
                message: error instanceof Error ? error.message : 'Could not select profile',
                lastSyncedAt: readLastSyncedAt(),
            });
        }
        throw error;
    }
}

/** Pull if linked and server is newer; flush dirty local first. */
export async function pullIfNewer(): Promise<void> {
    const code = loadProfile();
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
    const startSerial = getLocalChangeSerial();
    emitStatus({ kind: 'syncing', lastSyncedAt });

    try {
        const res = await fetchProgress(code);
        if (loadProfile() !== code) return;
        if (getLocalChangeSerial() !== startSerial || isProgressDirty()) {
            setProgressDirty(true);
            scheduleProgressPush();
            return;
        }
        if (res.status === 404) {
            await pushProgress();
            return;
        }
        if (!res.ok) {
            if (loadProfile() !== code) return;
            const message = await readErrorMessage(res);
            emitStatus({ kind: 'error', message, lastSyncedAt });
            return;
        }
        if (loadProfile() !== code) return;
        const doc = mergeLocalActivity(normalizeProgressDocument(await res.json()));
        if (getLocalChangeSerial() !== startSerial || isProgressDirty()) {
            setProgressDirty(true);
            scheduleProgressPush();
            return;
        }
        const remoteFirefly = doc.fireflyPost;
        const localFirefly = loadFireflyProgress(code);
        const mergedFirefly = newerFireflyProgress(localFirefly, remoteFirefly);
        const localFireflyIsNewer = mergedFirefly === localFirefly
            && localFirefly.updatedAt !== remoteFirefly.updatedAt;
        doc.fireflyPost = mergedFirefly;
        const serverUpdated = Date.parse(doc.updatedAt);
        const last = lastSyncedAt != null ? Date.parse(lastSyncedAt) : 0;

        if (Number.isFinite(serverUpdated) && serverUpdated > (Number.isFinite(last) ? last : 0)) {
            hydrateStoreFromDocument(doc);
            writeLastSyncedAt(doc.updatedAt);
        } else if (mergedFirefly === remoteFirefly && remoteFirefly.updatedAt !== localFirefly.updatedAt) {
            saveFireflyProgress(code, remoteFirefly, true);
        }
        setProgressDirty(localFireflyIsNewer);
        if (localFireflyIsNewer) scheduleProgressPush();
        emitStatus({ kind: 'linked', lastSyncedAt: readLastSyncedAt() ?? doc.updatedAt });
    } catch {
        if (loadProfile() !== code) return;
        emitStatus({
            kind: 'error',
            message: 'Could not reach the server',
            lastSyncedAt,
        });
    }
}

/** Explicitly replace unsynced local progress after a sync conflict. */
export async function useCloudProgress(): Promise<void> {
    const profile = loadProfile();
    if (profile == null) return;
    const startSerial = getLocalChangeSerial();
    const lastSyncedAt = readLastSyncedAt();
    emitStatus({ kind: 'syncing', lastSyncedAt });
    try {
        const res = await fetchProgress(profile);
        if (!res.ok) throw new Error(await readErrorMessage(res));
        const doc = normalizeProgressDocument(await res.json());
        if (loadProfile() !== profile || getLocalChangeSerial() !== startSerial) {
            throw new ProgressConflictError('Progress changed while loading the cloud version. Try again.');
        }
        hydrateStoreFromDocument(doc);
        writeLastSyncedAt(doc.updatedAt);
        setProgressDirty(false);
        emitStatus({ kind: 'linked', lastSyncedAt: doc.updatedAt });
    } catch (error) {
        if (loadProfile() !== profile) return;
        setProgressDirty(true);
        emitStatus({ kind: 'conflict',
            message: error instanceof Error ? error.message : 'Could not load cloud progress',
            lastSyncedAt });
        throw error;
    }
}

export function initProgressSync(): void {
    if (bootstrapped) {
        return;
    }
    bootstrapped = true;

    setProgressPushHandler(() => {
        if (isProgressDirty()) void pushProgress();
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
