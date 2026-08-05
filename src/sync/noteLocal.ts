import { loadPlayerCode } from '../model/playerCode';
import { setProgressDirty } from './localFlags';
import { scheduleProgressPush } from './pushQueue';

/** Mark dirty and schedule a server push when a player code is linked. */
export function noteLocalProgressChanged(): void {
    if (loadPlayerCode() == null) {
        return;
    }
    setProgressDirty(true);
    scheduleProgressPush();
}
