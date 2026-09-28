import { useEffect } from 'react';

/** One-time external-system setup and cleanup. */
export function useMountEffect(effect: () => void | (() => void)): void {
    useEffect(effect, []);
}
