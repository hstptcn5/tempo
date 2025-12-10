import { useCallback } from 'react';
import { useChainId, useSwitchChain, useAccount } from 'wagmi';

export interface UseWrongNetworkOptions {
    /** List of allowed chain IDs */
    allowedChains: readonly number[];
}

export interface UseWrongNetworkResult {
    /** Whether current chain is not in allowedChains */
    isWrongNetwork: boolean;
    /** Current chain ID */
    currentChainId: number | undefined;
    /** Target chain (first allowed chain) */
    targetChainId: number;
    /** Whether wallet is connected */
    isConnected: boolean;
    /** Whether switch is in progress */
    isSwitching: boolean;
    /** Switch to target network */
    switchNetwork: () => Promise<void>;
    /** Switch to specific chain */
    switchToChain: (chainId: number) => Promise<void>;
    /** Error message */
    error: string | null;
}

/**
 * Hook to detect wrong network and provide switch functionality
 */
export function useWrongNetwork(options: UseWrongNetworkOptions): UseWrongNetworkResult {
    const { allowedChains } = options;

    const chainId = useChainId();
    const { isConnected } = useAccount();
    const { switchChainAsync, isPending, error } = useSwitchChain();

    const targetChainId = allowedChains[0];
    const isWrongNetwork = isConnected && chainId !== undefined && !allowedChains.includes(chainId);

    const switchNetwork = useCallback(async () => {
        if (!targetChainId) return;
        try {
            await switchChainAsync({ chainId: targetChainId });
        } catch {
            // Error is captured in the hook state
        }
    }, [targetChainId, switchChainAsync]);

    const switchToChain = useCallback(async (newChainId: number) => {
        try {
            await switchChainAsync({ chainId: newChainId });
        } catch {
            // Error is captured in the hook state
        }
    }, [switchChainAsync]);

    return {
        isWrongNetwork,
        currentChainId: chainId,
        targetChainId,
        isConnected,
        isSwitching: isPending,
        switchNetwork,
        switchToChain,
        error: error?.message ?? null,
    };
}

/**
 * Simple hook to get chain switching functionality
 */
export function useChainSwitch() {
    const chainId = useChainId();
    const { switchChainAsync, isPending, error } = useSwitchChain();

    const switchTo = useCallback(async (targetChainId: number) => {
        if (chainId === targetChainId) return true;
        try {
            await switchChainAsync({ chainId: targetChainId });
            return true;
        } catch {
            return false;
        }
    }, [chainId, switchChainAsync]);

    return {
        currentChainId: chainId,
        switchTo,
        isSwitching: isPending,
        error: error?.message ?? null,
    };
}
