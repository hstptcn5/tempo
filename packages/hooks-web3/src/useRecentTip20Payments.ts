'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePublicClient, useAccount, useChainId } from 'wagmi';
import { type Address, type Hex, parseAbiItem } from 'viem';

/**
 * A payment log entry from blockchain events
 */
export interface PaymentLog {
    /** Transaction hash */
    txHash: Address;
    /** Block number */
    blockNumber: bigint;
    /** Log index */
    logIndex: number;
    /** Sender address */
    from: Address;
    /** Recipient address */
    to: Address;
    /** Amount in smallest unit */
    amount: bigint;
    /** Memo (if TransferWithMemo event) */
    memo?: Hex;
    /** Token address */
    tokenAddress: Address;
    /** Block timestamp (fetched separately) */
    timestamp?: number;
}

export interface UseRecentTip20PaymentsOptions {
    /** Token addresses to query (if not provided, queries all known tokens) */
    tokenAddresses?: Address[];
    /** Maximum number of payments to fetch */
    limit?: number;
    /** Filter by direction: 'sent' = from user, 'received' = to user, 'all' = both */
    direction?: 'sent' | 'received' | 'all';
    /** Number of blocks to look back (default: 10000) */
    blockRange?: number;
    /** Whether to auto-refresh */
    watch?: boolean;
    /** Refresh interval in ms (default: 30000) */
    refreshInterval?: number;
    /** Enable/disable the hook */
    enabled?: boolean;
}

export interface UseRecentTip20PaymentsResult {
    /** Payment logs */
    payments: PaymentLog[];
    /** Is currently loading */
    isLoading: boolean;
    /** Error if any */
    error: Error | null;
    /** Refetch payments */
    refetch: () => Promise<void>;
    /** Has more payments (for pagination) */
    hasMore: boolean;
    /** Load more payments */
    loadMore: () => Promise<void>;
}

/**
 * Hook to fetch recent TIP-20 payments for the connected wallet
 * Queries Transfer and TransferWithMemo events from the blockchain
 */
export function useRecentTip20Payments(
    options: UseRecentTip20PaymentsOptions = {}
): UseRecentTip20PaymentsResult {
    const {
        tokenAddresses = [],
        limit = 10,
        direction = 'all',
        blockRange = 10000,
        watch = false,
        refreshInterval = 30000,
        enabled = true,
    } = options;

    const { address: userAddress } = useAccount();
    const chainId = useChainId();
    const publicClient = usePublicClient();

    const [payments, setPayments] = useState<PaymentLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchPayments = useCallback(async (offset: number = 0, append: boolean = false) => {
        if (!publicClient || !userAddress || !enabled) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const currentBlock = await publicClient.getBlockNumber();
            const fromBlock = currentBlock - BigInt(blockRange);

            // Build filter args based on direction
            const buildArgs = (tokenAddress: Address) => {
                const baseArgs = {
                    address: tokenAddress,
                    fromBlock: fromBlock > 0n ? fromBlock : 0n,
                    toBlock: currentBlock,
                };

                if (direction === 'sent') {
                    return { ...baseArgs, args: { from: userAddress } };
                } else if (direction === 'received') {
                    return { ...baseArgs, args: { to: userAddress } };
                }
                // 'all' - we'll filter manually
                return baseArgs;
            };

            const allLogs: PaymentLog[] = [];

            // Query each token address
            for (const tokenAddress of tokenAddresses) {
                // Query Transfer events
                const transferLogs = await publicClient.getLogs({
                    ...buildArgs(tokenAddress),
                    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
                });

                // Query TransferWithMemo events
                const memoLogs = await publicClient.getLogs({
                    ...buildArgs(tokenAddress),
                    event: parseAbiItem('event TransferWithMemo(address indexed from, address indexed to, uint256 value, bytes32 memo)'),
                });

                // Process Transfer logs
                for (const log of transferLogs) {
                    const from = log.args?.from as Address | undefined;
                    const to = log.args?.to as Address | undefined;
                    const value = log.args?.value as bigint | undefined;

                    // Skip logs with missing data
                    if (!from || !to || value === undefined) {
                        continue;
                    }

                    // Filter for 'all' direction
                    if (direction === 'all' && from !== userAddress && to !== userAddress) {
                        continue;
                    }

                    allLogs.push({
                        txHash: log.transactionHash as Address,
                        blockNumber: log.blockNumber,
                        logIndex: log.logIndex,
                        from,
                        to,
                        amount: value,
                        tokenAddress,
                    });
                }

                // Process TransferWithMemo logs
                for (const log of memoLogs) {
                    const from = log.args?.from as Address | undefined;
                    const to = log.args?.to as Address | undefined;
                    const value = log.args?.value as bigint | undefined;
                    const memoValue = log.args?.memo as Hex | undefined;

                    // Skip logs with missing data
                    if (!from || !to || value === undefined) {
                        continue;
                    }

                    // Filter for 'all' direction
                    if (direction === 'all' && from !== userAddress && to !== userAddress) {
                        continue;
                    }

                    allLogs.push({
                        txHash: log.transactionHash as Address,
                        blockNumber: log.blockNumber,
                        logIndex: log.logIndex,
                        from,
                        to,
                        amount: value,
                        memo: memoValue,
                        tokenAddress,
                    });
                }
            }

            // Sort by block number (descending) and log index
            allLogs.sort((a, b) => {
                if (b.blockNumber !== a.blockNumber) {
                    return Number(b.blockNumber - a.blockNumber);
                }
                return b.logIndex - a.logIndex;
            });

            // Deduplicate by txHash (keep memo version if both exist)
            const seenTxHashes = new Set<string>();
            const dedupedLogs = allLogs.filter(log => {
                const key = `${log.txHash}-${log.logIndex}`;
                if (seenTxHashes.has(key)) {
                    return false;
                }
                seenTxHashes.add(key);
                return true;
            });

            // Paginate
            const paginatedLogs = dedupedLogs.slice(offset, offset + limit);
            setHasMore(dedupedLogs.length > offset + limit);

            // Optionally fetch timestamps for each unique block
            const uniqueBlocks = [...new Set(paginatedLogs.map(l => l.blockNumber))];
            const blockTimestamps: Record<string, number> = {};

            // Batch fetch block timestamps (limit to avoid too many requests)
            const blocksToFetch = uniqueBlocks.slice(0, 20);
            await Promise.all(
                blocksToFetch.map(async (blockNum) => {
                    try {
                        const block = await publicClient.getBlock({ blockNumber: blockNum });
                        blockTimestamps[blockNum.toString()] = Number(block.timestamp);
                    } catch {
                        // Ignore timestamp fetch errors
                    }
                })
            );

            // Add timestamps to logs
            const logsWithTimestamps = paginatedLogs.map(log => ({
                ...log,
                timestamp: blockTimestamps[log.blockNumber.toString()],
            }));

            if (append) {
                setPayments(prev => [...prev, ...logsWithTimestamps]);
            } else {
                setPayments(logsWithTimestamps);
            }
            setCurrentOffset(offset + paginatedLogs.length);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch payments'));
        } finally {
            setIsLoading(false);
        }
    }, [publicClient, userAddress, tokenAddresses, limit, direction, blockRange, enabled]);

    // Initial fetch
    useEffect(() => {
        if (enabled && userAddress && tokenAddresses.length > 0) {
            fetchPayments(0, false);
        }
    }, [enabled, userAddress, chainId, tokenAddresses.join(',')]);

    // Watch mode - auto refresh
    useEffect(() => {
        if (!watch || !enabled) return;

        const interval = setInterval(() => {
            fetchPayments(0, false);
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [watch, enabled, refreshInterval, fetchPayments]);

    const refetch = useCallback(async () => {
        setCurrentOffset(0);
        await fetchPayments(0, false);
    }, [fetchPayments]);

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return;
        await fetchPayments(currentOffset, true);
    }, [fetchPayments, currentOffset, hasMore, isLoading]);

    return {
        payments,
        isLoading,
        error,
        refetch,
        hasMore,
        loadMore,
    };
}

