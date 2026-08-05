type PushFn = () => void;

let pushHandler: PushFn | null = null;
let scheduled = false;
const DEBOUNCE_MS = 300;

export function setProgressPushHandler(fn: PushFn | null): void {
    pushHandler = fn;
}

/** Debounced nudge to push local progress to the server when a player code is linked. */
export function scheduleProgressPush(): void {
    if (pushHandler == null) {
        return;
    }
    if (scheduled) {
        return;
    }
    scheduled = true;
    setTimeout(() => {
        scheduled = false;
        pushHandler?.();
    }, DEBOUNCE_MS);
}
