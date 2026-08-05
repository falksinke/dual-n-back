import { createContext, useContext } from 'react';

const HapticsEnabledContext = createContext(true);

export const HapticsEnabledProvider = HapticsEnabledContext.Provider;

export function useHapticsEnabled(): boolean {
    return useContext(HapticsEnabledContext);
}
