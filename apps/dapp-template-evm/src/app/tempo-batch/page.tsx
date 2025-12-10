'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAccount, useChainId, useSwitchChain, useWriteContract } from 'wagmi';
import { parseUnits, isAddress, formatUnits, type Address, type Hex } from 'viem';
import { TOKENS, CHAIN_IDS, tip20Abi, type TokenInfo } from '@hst/abis';
import { ConnectButton, ChainSelector, TxToastContainer, useTxToast } from '@hst/ui-web3';
import { useTokenBalance, formatBalance, decodeError, getByteLength } from '@hst/hooks-web3';
import { chains, getExplorerUrl } from '@hst/web3-config';
import {
    type BatchMode,
    type BatchRecipientInput,
    validateAndBuildBatch,
    parseCSV,
    getBatchModeDescription,
    buildBatchTransferArrays,
    BATCH_TRANSFER_ADDRESS,
    BATCH_TRANSFER_ENABLED,
    batchTransferAbi,
} from '@/lib/tempo';
import { erc20Abi } from '@hst/abis';

// Feature flag check
const BATCH_ENABLED = process.env.NEXT_PUBLIC_TEMPO_BATCH === '1';

// Tempo testnet chain ID
const TEMPO_CHAIN_ID = CHAIN_IDS.TEMPO_TESTNET;

// Recipient entry type (UI state)
interface UIBatchRecipient {
    id: string;
    address: string;
    amount: string;
    memo?: string;
    isValid: boolean;
    error?: string;
}

// Batch execution status
type BatchStatus = 'idle' | 'validating' | 'executing' | 'completed' | 'failed';

interface BatchProgress {
    current: number;
    total: number;
    successCount: number;
    failedCount: number;
    txHashes: Address[];
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Feature flag gate component
function FeatureGate({ children }: { children: React.ReactNode }) {
    if (!BATCH_ENABLED) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">🔒</div>
                    <h1 className="text-2xl font-bold mb-2">Feature Not Enabled</h1>
                    <p className="text-white/50 mb-4">
                        Batch payments are behind a feature flag. Set{' '}
                        <code className="text-amber-400">NEXT_PUBLIC_TEMPO_BATCH=1</code>{' '}
                        in your environment to enable.
                    </p>
                    <Link href="/tempo-pay" className="text-emerald-400 hover:underline">
                        ← Back to Single Payments
                    </Link>
                </div>
            </div>
        );
    }
    return <>{children}</>;
}

// SSR Guard
function SSRGuard({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    
    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-purple-400 rounded-full" />
            </div>
        );
    }
    
    return <>{children}</>;
}

export default function TempoBatchPage() {
    return (
        <FeatureGate>
            <SSRGuard>
                <TempoBatchContent />
            </SSRGuard>
        </FeatureGate>
    );
}

function TempoBatchContent() {
    const { isConnected, address: userAddress } = useAccount();
    const chainId = useChainId();
    const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
    const { toasts, show, update, hide } = useTxToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if on Tempo network
    const isOnTempo = chainId === TEMPO_CHAIN_ID;

    // Batch mode selection
    const [batchMode, setBatchMode] = useState<BatchMode>('sequential');

    // Form state
    const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
    const [recipients, setRecipients] = useState<UIBatchRecipient[]>([
        { id: generateId(), address: '', amount: '', isValid: false },
    ]);
    const [batchStatus, setBatchStatus] = useState<BatchStatus>('idle');
    const [progress, setProgress] = useState<BatchProgress>({
        current: 0,
        total: 0,
        successCount: 0,
        failedCount: 0,
        txHashes: [],
    });

    // Get Tempo testnet tokens
    const tempoTokens = TOKENS[TEMPO_CHAIN_ID] ?? {};
    const tokenList = Object.values(tempoTokens);

    // Set default token when list changes
    useEffect(() => {
        if (!selectedToken && tokenList.length > 0) {
            setSelectedToken(tokenList[0]);
        }
    }, [tokenList, selectedToken]);

    // Token balance
    const { balance } = useTokenBalance({
        token: selectedToken?.address as Address,
        watch: true,
        enabled: !!selectedToken && isConnected && isOnTempo,
    });

    // Validate a single recipient for UI
    const validateRecipientUI = useCallback((recipient: UIBatchRecipient, decimals: number): UIBatchRecipient => {
        let isValid = true;
        let error: string | undefined;

        if (!recipient.address) {
            isValid = false;
            error = 'Address required';
        } else if (!isAddress(recipient.address)) {
            isValid = false;
            error = 'Invalid address';
        }

        if (!recipient.amount) {
            isValid = false;
            error = error || 'Amount required';
        } else {
            try {
                const parsed = parseUnits(recipient.amount, decimals);
                if (parsed <= 0n) {
                    isValid = false;
                    error = error || 'Amount must be > 0';
                }
            } catch {
                isValid = false;
                error = error || 'Invalid amount';
            }
        }

        // Validate memo byte length
        if (recipient.memo && getByteLength(recipient.memo) > 32) {
            isValid = false;
            error = error || `Memo exceeds 32 bytes (${getByteLength(recipient.memo)} bytes)`;
        }

        return { ...recipient, isValid, error };
    }, []);

    // Validate all recipients when token changes
    useEffect(() => {
        if (selectedToken) {
            setRecipients(prev =>
                prev.map(r => validateRecipientUI(r, selectedToken.decimals))
            );
        }
    }, [selectedToken, validateRecipientUI]);

    // Calculate totals and validation
    const batchValidation = useMemo(() => {
        if (!selectedToken) {
            return { 
                totalAmount: 0n, 
                validCount: 0, 
                invalidCount: 0, 
                calls: [], 
                errors: [] as string[], 
                isValid: false,
                recipients: [],
            };
        }

        const inputs: BatchRecipientInput[] = recipients.map(r => ({
            address: r.address,
            amount: r.amount,
            memo: r.memo,
        }));

        const validation = validateAndBuildBatch(inputs, {
            tokenAddress: selectedToken.address as Address,
            tokenDecimals: selectedToken.decimals,
            userBalance: balance,
            strictMode: true,
        });

        let validCount = 0;
        let invalidCount = 0;
        for (const r of validation.recipients) {
            if (r.isValid) validCount++;
            else if (r.address !== '0x0000000000000000000000000000000000000000' || r.amount > 0n) invalidCount++;
        }

        return {
            totalAmount: validation.totalAmount,
            validCount,
            invalidCount,
            calls: validation.calls,
            errors: validation.errors,
            isValid: validation.isValid,
            recipients: validation.recipients, // For atomic batch
        };
    }, [recipients, selectedToken, balance]);

    // Check if total exceeds balance
    const exceedsBalance = balance !== undefined && batchValidation.totalAmount > balance;

    // Add new recipient row
    const addRecipient = useCallback(() => {
        setRecipients(prev => [
            ...prev,
            { id: generateId(), address: '', amount: '', isValid: false },
        ]);
    }, []);

    // Remove recipient row
    const removeRecipient = useCallback((id: string) => {
        setRecipients(prev => {
            if (prev.length <= 1) return prev;
            return prev.filter(r => r.id !== id);
        });
    }, []);

    // Update recipient field
    const updateRecipient = useCallback((id: string, field: 'address' | 'amount' | 'memo', value: string) => {
        setRecipients(prev =>
            prev.map(r => {
                if (r.id !== id) return r;
                const updated = { ...r, [field]: value };
                return selectedToken
                    ? validateRecipientUI(updated, selectedToken.decimals)
                    : updated;
            })
        );
    }, [selectedToken, validateRecipientUI]);

    // Handle file upload (CSV)
    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const parsed = parseCSV(content);
            if (parsed.length > 0) {
                const uiRecipients: UIBatchRecipient[] = parsed.map(p => {
                    const r: UIBatchRecipient = {
                        id: generateId(),
                        address: p.address,
                        amount: p.amount,
                        memo: p.memo,
                        isValid: false,
                    };
                    return selectedToken ? validateRecipientUI(r, selectedToken.decimals) : r;
                });
                setRecipients(uiRecipients);
                show('csv', {
                    status: 'success',
                    title: 'CSV Imported',
                    message: `Loaded ${parsed.length} recipients`,
                });
                setTimeout(() => hide('csv'), 3000);
            }
        };
        reader.readAsText(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [selectedToken, validateRecipientUI, show, hide]);

    // Clear all recipients
    const clearAll = useCallback(() => {
        setRecipients([{ id: generateId(), address: '', amount: '', isValid: false }]);
        setProgress({ current: 0, total: 0, successCount: 0, failedCount: 0, txHashes: [] });
        setBatchStatus('idle');
    }, []);

    // Contract write hook
    const { writeContractAsync } = useWriteContract();

    // Execute batch - Sequential mode
    const executeSequential = useCallback(async () => {
        if (!selectedToken || !userAddress || batchValidation.validCount === 0) return;

        const validRecipients = recipients.filter(r => r.isValid);
        setBatchStatus('executing');
        setProgress({
            current: 0,
            total: validRecipients.length,
            successCount: 0,
            failedCount: 0,
            txHashes: [],
        });

        show('batch', {
            status: 'pending',
            title: 'Sequential Batch',
            message: `Processing 0/${validRecipients.length} payments...`,
        });

        let successCount = 0;
        let failedCount = 0;
        const txHashes: Address[] = [];

        for (let i = 0; i < validRecipients.length; i++) {
            const recipient = validRecipients[i];
            const parsedAmount = parseUnits(recipient.amount, selectedToken.decimals);

            try {
                // Use transfer or transferWithMemo depending on memo presence
                const hasMemo = recipient.memo && recipient.memo.trim().length > 0;
                
                let hash: Address;
                if (hasMemo) {
                    const { encodeMemoBytes32 } = await import('@hst/hooks-web3');
                    const encoded = encodeMemoBytes32(recipient.memo!);
                    hash = await writeContractAsync({
                        address: selectedToken.address as Address,
                        abi: tip20Abi,
                        functionName: 'transferWithMemo',
                        args: [recipient.address as Address, parsedAmount, encoded.bytes32],
                        chainId: TEMPO_CHAIN_ID,
                    });
                } else {
                    hash = await writeContractAsync({
                        address: selectedToken.address as Address,
                        abi: tip20Abi,
                        functionName: 'transfer',
                        args: [recipient.address as Address, parsedAmount],
                        chainId: TEMPO_CHAIN_ID,
                    });
                }

                txHashes.push(hash);
                successCount++;

                setProgress(prev => ({
                    ...prev,
                    current: i + 1,
                    successCount,
                    txHashes: [...prev.txHashes, hash],
                }));

                update('batch', {
                    message: `Processing ${i + 1}/${validRecipients.length}... (${successCount} success)`,
                });
            } catch (err) {
                const decoded = decodeError(err);
                
                if (decoded.isUserRejection) {
                    setBatchStatus('failed');
                    update('batch', {
                        status: 'error',
                        title: 'Batch Cancelled',
                        error: 'User rejected transaction',
                    });
                    return;
                }

                // Check for TIP-403 compliance errors
                if (decoded.isComplianceError) {
                    failedCount++;
                    setProgress(prev => ({
                        ...prev,
                        current: i + 1,
                        failedCount,
                    }));
                    update('batch', {
                        message: `Row ${i + 1} blocked by compliance policy: ${decoded.message}`,
                    });
                    continue;
                }

                failedCount++;
                setProgress(prev => ({
                    ...prev,
                    current: i + 1,
                    failedCount,
                }));
            }
        }

        // Final status
        if (failedCount === 0) {
            setBatchStatus('completed');
            update('batch', {
                status: 'success',
                title: 'Batch Complete',
                message: `Successfully sent ${successCount} payments`,
            });
        } else if (successCount > 0) {
            setBatchStatus('completed');
            update('batch', {
                status: 'success',
                title: 'Batch Partial Success',
                message: `${successCount} succeeded, ${failedCount} failed`,
            });
        } else {
            setBatchStatus('failed');
            update('batch', {
                status: 'error',
                title: 'Batch Failed',
                error: 'All transactions failed',
            });
        }
    }, [selectedToken, userAddress, recipients, batchValidation.validCount, writeContractAsync, show, update]);

    // Execute batch - Atomic mode (via BatchTransfer contract)
    const executeAtomic = useCallback(async () => {
        if (!selectedToken || !userAddress || !batchValidation.isValid || !BATCH_TRANSFER_ADDRESS) return;

        setBatchStatus('executing');
        setProgress({
            current: 0,
            total: 2, // 1. Approve, 2. Batch transfer
            successCount: 0,
            failedCount: 0,
            txHashes: [],
        });

        show('batch', {
            status: 'pending',
            title: 'Atomic Batch',
            message: 'Checking approval...',
        });

        try {
            // Build arrays for BatchTransfer
            const { recipients, amounts, hasMemos } = buildBatchTransferArrays(batchValidation.recipients);
            
            // Step 1: Approve BatchTransfer contract for total amount
            update('batch', {
                message: `Approving BatchTransfer contract for ${formatUnits(batchValidation.totalAmount, selectedToken.decimals)} ${selectedToken.symbol}...`,
            });

            const approveHash = await writeContractAsync({
                address: selectedToken.address as Address,
                abi: erc20Abi,
                functionName: 'approve',
                args: [BATCH_TRANSFER_ADDRESS, batchValidation.totalAmount],
                chainId: TEMPO_CHAIN_ID,
            });

            setProgress(prev => ({
                ...prev,
                current: 1,
                txHashes: [approveHash],
            }));

            update('batch', {
                txHash: approveHash,
                message: `Approved! Now submitting batch transfer...`,
            });

            // Step 2: Call BatchTransfer contract
            // Note: batchTransferWithMemo may fail if TIP-20 tokens don't allow
            // contract-to-user transfers via transferWithMemo. Using batchTransfer
            // (without memo) which works with standard transferFrom.
            // TODO: Re-enable batchTransferWithMemo when contract compatibility is confirmed
            
            const batchHash = await writeContractAsync({
                address: BATCH_TRANSFER_ADDRESS,
                abi: batchTransferAbi,
                functionName: 'batchTransfer',
                args: [selectedToken.address as Address, recipients, amounts],
                chainId: TEMPO_CHAIN_ID,
            });
            
            // Log warning if memos were provided but not used
            if (hasMemos) {
                console.warn('Atomic batch: Memos were provided but not included (using batchTransfer without memo support)');
            }

            setProgress({
                current: 2,
                total: 2,
                successCount: recipients.length,
                failedCount: 0,
                txHashes: [approveHash, batchHash],
            });

            setBatchStatus('completed');
            update('batch', {
                status: 'success',
                txHash: batchHash,
                title: 'Atomic Batch Complete! 🎉',
                message: `All ${recipients.length} transfers sent in 1 transaction`,
                chainId: TEMPO_CHAIN_ID,
            });
        } catch (err) {
            const decoded = decodeError(err);
            
            if (decoded.isUserRejection) {
                setBatchStatus('idle');
                hide('batch');
                return;
            }

            setBatchStatus('failed');
            
            // Check for TIP-403 compliance errors - provide specific guidance
            if (decoded.isComplianceError) {
                update('batch', {
                    status: 'error',
                    title: 'Compliance Policy Block',
                    error: `${decoded.message}. One or more recipients may be blocked by token policy.`,
                });
            } else {
                update('batch', {
                    status: 'error',
                    title: 'Atomic Batch Failed',
                    error: decoded.message || 'All transfers reverted',
                });
            }
        }
    }, [selectedToken, userAddress, batchValidation, writeContractAsync, show, update, hide]);

    // Execute batch (dispatch to mode)
    const executeBatch = useCallback(() => {
        if (batchMode === 'atomic') {
            executeAtomic();
        } else {
            executeSequential();
        }
    }, [batchMode, executeAtomic, executeSequential]);

    // Network switch handler
    const handleSwitchToTempo = async () => {
        try {
            await switchChainAsync({ chainId: TEMPO_CHAIN_ID });
        } catch (error) {
            console.error('Failed to switch to Tempo:', error);
        }
    };

    // Can execute?
    const canExecute = isConnected && isOnTempo && batchValidation.validCount > 0 && !exceedsBalance && batchStatus !== 'executing';
    const canExecuteAtomic = canExecute && batchValidation.isValid && batchValidation.errors.length === 0;

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            dApp Template
                        </Link>
                        <nav className="hidden md:flex items-center gap-6">
                            <Link href="/" className="text-white/70 hover:text-white transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/tempo-pay" className="text-white/70 hover:text-white transition-colors">
                                Tempo Pay
                            </Link>
                            <Link href="/tempo-batch" className="text-purple-400 font-medium">
                                Batch Pay
                            </Link>
                            <Link href="/tempo-sponsor" className="text-white/70 hover:text-white transition-colors">
                                Sponsored
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <ChainSelector supportedChains={[chains.tempoTestnet] as any} />
                        <ConnectButton showBalance={false} />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <span className="text-purple-400 text-xl">📦</span>
                            </div>
                            <h1 className="text-3xl font-bold">Batch Payments</h1>
                        </div>
                        <p className="text-white/50">
                            Send stablecoin payments to multiple recipients
                        </p>
                    </div>

                    {/* Network Notice */}
                    {isConnected && !isOnTempo && (
                        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <div className="flex items-start gap-3">
                                <div className="text-amber-400 text-xl">⚠️</div>
                                <div className="flex-1">
                                    <h3 className="text-amber-400 font-medium mb-1">Wrong Network</h3>
                                    <p className="text-white/70 text-sm mb-3">
                                        Please switch to Tempo Testnet to use batch payments.
                                    </p>
                                    <button
                                        onClick={handleSwitchToTempo}
                                        disabled={isSwitchingChain}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isSwitchingChain ? 'Switching...' : 'Switch to Tempo Testnet'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Batch Mode Toggle */}
                    <div className="card mb-6">
                        <h3 className="font-medium mb-3">Batch Mode</h3>
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => setBatchMode('sequential')}
                                disabled={batchStatus === 'executing'}
                                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                                    batchMode === 'sequential'
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-white/10 hover:bg-white/20'
                                }`}
                            >
                                Sequential ✅
                            </button>
                            <button
                                onClick={() => setBatchMode('atomic')}
                                disabled={batchStatus === 'executing' || !BATCH_TRANSFER_ENABLED}
                                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                                    batchMode === 'atomic'
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-white/10 hover:bg-white/20'
                                }`}
                            >
                                Atomic ⚡
                            </button>
                        </div>
                        <p className="text-white/50 text-sm">
                            {getBatchModeDescription(batchMode)}
                        </p>
                        {batchMode === 'sequential' && (
                            <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/30">
                                <p className="text-green-400 text-xs">
                                    ✅ Each payment sent individually. Partial success possible.
                                </p>
                            </div>
                        )}
                        {batchMode === 'atomic' && (
                            <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30">
                                <p className="text-amber-400 text-xs">
                                    ⚠️ <strong>All-or-nothing:</strong> If any transfer fails, the entire batch reverts.
                                </p>
                                <p className="text-amber-400/70 text-xs mt-1">
                                    ⚠️ <strong>Note:</strong> Memos are NOT included in atomic mode (TIP-20 limitation).
                                    Use Sequential mode if you need memos.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Token Selection */}
                    <div className="card mb-6">
                        <div className="mb-4">
                            <label className="block text-sm text-white/50 mb-2">TIP-20 Stablecoin</label>
                            <div className="flex flex-wrap gap-2">
                                {tokenList.map((token) => (
                                    <button
                                        key={token.address}
                                        onClick={() => setSelectedToken(token)}
                                        disabled={batchStatus === 'executing'}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                                            selectedToken?.address === token.address
                                                ? 'bg-purple-500 text-white'
                                                : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                    >
                                        {token.symbol}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Balance Display */}
                        {selectedToken && balance !== undefined && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-white/50">Your Balance:</span>
                                <span className={exceedsBalance ? 'text-red-400' : 'text-white'}>
                                    {formatBalance(balance, selectedToken.decimals)} {selectedToken.symbol}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Recipients List */}
                    <div className="card mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium">Recipients</h3>
                            <div className="flex gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={batchStatus === 'executing'}
                                    className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-50"
                                >
                                    📄 Import CSV
                                </button>
                                <button
                                    onClick={clearAll}
                                    disabled={batchStatus === 'executing'}
                                    className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded-lg disabled:opacity-50"
                                >
                                    🗑️ Clear
                                </button>
                            </div>
                        </div>

                        <p className="text-white/30 text-xs mb-3">
                            CSV format: <code className="text-purple-400">address,amount,memo</code>
                        </p>

                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {recipients.map((recipient, index) => (
                                <div key={recipient.id} className="flex gap-2 items-start">
                                    <span className="text-white/30 text-sm w-6 pt-3">{index + 1}.</span>
                                    <div className="flex-1 space-y-2">
                                        <input
                                            type="text"
                                            value={recipient.address}
                                            onChange={(e) => updateRecipient(recipient.id, 'address', e.target.value)}
                                            placeholder="0x... recipient address"
                                            disabled={batchStatus === 'executing'}
                                            className={`w-full px-3 py-2 bg-white/5 border rounded-lg focus:outline-none font-mono text-sm disabled:opacity-50 ${
                                                recipient.address && !isAddress(recipient.address)
                                                    ? 'border-red-500/50'
                                                    : 'border-white/10 focus:border-purple-500'
                                            }`}
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={recipient.amount}
                                                onChange={(e) => updateRecipient(recipient.id, 'amount', e.target.value)}
                                                placeholder="Amount"
                                                disabled={batchStatus === 'executing'}
                                                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 text-sm disabled:opacity-50"
                                            />
                                            <div className="flex-1 relative">
                                                <input
                                                    type="text"
                                                    value={recipient.memo || ''}
                                                    onChange={(e) => updateRecipient(recipient.id, 'memo', e.target.value)}
                                                    placeholder="Memo (≤32 bytes)"
                                                    disabled={batchStatus === 'executing'}
                                                    className={`w-full px-3 py-2 bg-white/5 border rounded-lg focus:outline-none text-sm disabled:opacity-50 ${
                                                        recipient.memo && getByteLength(recipient.memo) > 32
                                                            ? 'border-red-500/50'
                                                            : 'border-white/10 focus:border-purple-500'
                                                    }`}
                                                />
                                                {recipient.memo && (
                                                    <span className={`absolute right-2 top-2 text-xs ${
                                                        getByteLength(recipient.memo) > 32 ? 'text-red-400' : 'text-white/30'
                                                    }`}>
                                                        {getByteLength(recipient.memo)}/32
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {recipient.error && (
                                            <p className="text-red-400 text-xs">{recipient.error}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeRecipient(recipient.id)}
                                        disabled={recipients.length <= 1 || batchStatus === 'executing'}
                                        className="p-2 text-white/50 hover:text-red-400 disabled:opacity-30"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={addRecipient}
                            disabled={batchStatus === 'executing'}
                            className="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-white/50 hover:text-white hover:border-white/40 transition-colors disabled:opacity-50"
                        >
                            + Add Recipient
                        </button>
                    </div>

                    {/* Summary */}
                    <div className="card mb-6">
                        <h3 className="font-medium mb-3">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/50">Mode:</span>
                                <span className={batchMode === 'atomic' ? 'text-purple-400' : 'text-white'}>
                                    {batchMode === 'atomic' ? '⚡ Atomic (1 tx)' : '📝 Sequential'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Valid Recipients:</span>
                                <span className="text-green-400">{batchValidation.validCount}</span>
                            </div>
                            {batchValidation.invalidCount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-white/50">Invalid:</span>
                                    <span className="text-red-400">{batchValidation.invalidCount}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-white/10">
                                <span className="text-white/50">Total Amount:</span>
                                <span className={exceedsBalance ? 'text-red-400' : 'text-white font-medium'}>
                                    {selectedToken ? formatUnits(batchValidation.totalAmount, selectedToken.decimals) : '0'}{' '}
                                    {selectedToken?.symbol ?? 'USD'}
                                </span>
                            </div>
                            {exceedsBalance && (
                                <p className="text-red-400 text-xs">Exceeds available balance</p>
                            )}
                            {batchMode === 'atomic' && batchValidation.errors.length > 0 && (
                                <div className="pt-2 border-t border-white/10">
                                    <p className="text-red-400 text-xs mb-1">Validation errors (fix before atomic):</p>
                                    {batchValidation.errors.slice(0, 3).map((err, i) => (
                                        <p key={i} className="text-red-400/70 text-xs">• {err}</p>
                                    ))}
                                    {batchValidation.errors.length > 3 && (
                                        <p className="text-red-400/50 text-xs">... and {batchValidation.errors.length - 3} more</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress (when executing) */}
                    {batchStatus === 'executing' && (
                        <div className="card mb-6">
                            <h3 className="font-medium mb-3">Progress</h3>
                            <div className="mb-2">
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div
                                        className="bg-purple-500 h-2 rounded-full transition-all"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/50">
                                    {batchMode === 'atomic' 
                                        ? 'Submitting atomic transaction...'
                                        : `${progress.current} / ${progress.total} processed`
                                    }
                                </span>
                                {batchMode === 'sequential' && (
                                    <span>
                                        <span className="text-green-400">{progress.successCount} ✓</span>
                                        {progress.failedCount > 0 && (
                                            <span className="text-red-400 ml-2">{progress.failedCount} ✗</span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Results (after completion) */}
                    {(batchStatus === 'completed' || batchStatus === 'failed') && progress.txHashes.length > 0 && (
                        <div className="card mb-6">
                            <h3 className="font-medium mb-3">
                                {batchMode === 'atomic' ? 'Transaction' : 'Transaction Hashes'}
                            </h3>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {progress.txHashes.map((hash, i) => (
                                    <a
                                        key={hash}
                                        href={getExplorerUrl(TEMPO_CHAIN_ID, 'tx', hash)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-sm font-mono text-purple-400 hover:underline"
                                    >
                                        {batchMode === 'atomic' ? '' : `${i + 1}. `}{hash.slice(0, 10)}...{hash.slice(-8)} ↗
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    {!isConnected ? (
                        <ConnectButton />
                    ) : !isOnTempo ? (
                        <button
                            onClick={handleSwitchToTempo}
                            disabled={isSwitchingChain}
                            className="btn btn-primary w-full bg-purple-500 hover:bg-purple-600"
                        >
                            {isSwitchingChain ? 'Switching Network...' : 'Switch to Tempo Testnet'}
                        </button>
                    ) : (
                        <button
                            onClick={executeBatch}
                            disabled={batchMode === 'atomic' ? !canExecuteAtomic : !canExecute}
                            className="btn btn-primary w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {batchStatus === 'executing'
                                ? batchMode === 'atomic' 
                                    ? 'Submitting...'
                                    : `Processing ${progress.current}/${progress.total}...`
                                : batchStatus === 'completed'
                                ? 'Start New Batch'
                                : batchMode === 'atomic'
                                ? `Send ${batchValidation.validCount} Transfers (1 Transaction)`
                                : `Send to ${batchValidation.validCount} Recipient${batchValidation.validCount !== 1 ? 's' : ''}`
                            }
                        </button>
                    )}

                    {/* Reset button after completion */}
                    {(batchStatus === 'completed' || batchStatus === 'failed') && (
                        <button
                            onClick={clearAll}
                            className="w-full mt-3 py-2 text-sm text-white/50 hover:text-white"
                        >
                            ↻ Reset & Start New Batch
                        </button>
                    )}
                </div>
            </main>

            {/* Toast Container */}
            <TxToastContainer toasts={toasts} onClose={hide} />
        </div>
    );
}
