export const MODAL_EXIT_MS = 220;

/** Exit-animation delay; collapses to 0 under prefers-reduced-motion. */
export const getModalExitDelay = (): number => {
    if (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
        return 0;
    }
    return MODAL_EXIT_MS;
};
