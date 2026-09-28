import { loadProfile } from '../model/profile';
import { setProgressDirty } from './localFlags';
import { scheduleProgressPush } from './pushQueue';

let localChangeSerial = 0;

export function getLocalChangeSerial(): number {
    return localChangeSerial;
}

/** Mark dirty and schedule a server push when a profile is selected. */
export function noteLocalProgressChanged(): void {
    if (loadProfile() == null) {
        return;
    }
    localChangeSerial += 1;
    setProgressDirty(true);
    scheduleProgressPush();
}
