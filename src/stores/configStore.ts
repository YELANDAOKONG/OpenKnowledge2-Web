import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SystemConfig } from '../models/types';

interface ConfigState {
    config: SystemConfig;
    isConfigured: boolean;
    updateConfig: (config: Partial<SystemConfig>) => void;
    setIsConfigured: (value: boolean) => void;
}

export const useConfigStore = create<ConfigState>()(
    persist(
        (set) => ({
            config: {
                OpenAiApiUrl: null,
                OpenAiApiKey: null,
                OpenAiModel: null,
                OpenAiModelTemperature: 0.7,
            },
            isConfigured: false,
            updateConfig: (newConfig) =>
                set((state) => ({
                    config: { ...state.config, ...newConfig },
                    isConfigured: true,
                })),
            setIsConfigured: (value) => set({ isConfigured: value }),
        }),
        {
            name: 'config-storage',
        }
    )
);
