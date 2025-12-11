'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useChainId, useWatchContractEvent, useBlockNumber } from 'wagmi';
import { isAddress, type Address, type Log } from 'viem';
import { erc20Abi, TOKENS } from '@hst/abis';
import { AddressDisplay, ConnectButton, ChainSelector } from '@hst/ui-web3';
import { formatBalance } from '@hst/hooks-web3';

interface TransferEvent {
    from: Address;
    to: Address;
    value: bigint;
    transactionHash: string;
    blockNumber: bigint;
    timestamp: number;
}

export default function EventsPage() {
    const chainId = useChainId();
    const { data: blockNumber } = useBlockNumber({ watch: true });

    // Token to watch
    const [tokenAddress, setTokenAddress] = useState('');
    const [isWatching, setIsWatching] = useState(false);
    const [events, setEvents] = useState<TransferEvent[]>([]);
    const [decimals, setDecimals] = useState(18);
    const [symbol, setSymbol] = useState('');

    // Quick tokens
    const chainTokens = TOKENS[chainId] ?? {};
    const quickTokens = Object.entries(chainTokens).slice(0, 4);

    // Parse token address
    const validTokenAddress = isAddress(tokenAddress) ? tokenAddress : undefined;

    // Watch Transfer events
    useWatchContractEvent({
        address: validTokenAddress,
        abi: erc20Abi,
        eventName: 'Transfer',
        enabled: isWatching && !!validTokenAddress,
        onLogs(logs) {
            const newEvents: TransferEvent[] = logs.map((log) => ({
                from: (log as Log & { args: { from: Address; to: Address; value: bigint } }).args.from,
                to: (log as Log & { args: { from: Address; to: Address; value: bigint } }).args.to,
                value: (log as Log & { args: { from: Address; to: Address; value: bigint } }).args.value,
                transactionHash: log.transactionHash ?? '',
                blockNumber: log.blockNumber ?? 0n,
                timestamp: Date.now(),
            }));

            setEvents((prev) => [...newEvents, ...prev].slice(0, 50)); // Keep last 50
        },
    });

    // Toggle watching
    const handleToggleWatch = () => {
        if (isWatching) {
            setIsWatching(false);
        } else if (validTokenAddress) {
            setEvents([]);
            setIsWatching(true);
        }
    };

    // Set token from quick select
    const handleQuickSelect = (addr: string, sym: string, dec: number) => {
        setTokenAddress(addr);
        setSymbol(sym);
        setDecimals(dec);
        setEvents([]);
        setIsWatching(false);
    };

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            dApp Template
                        </Link>
                        <nav className="hidden md:flex items-center gap-6">
                            <Link href="/" className="text-white/70 hover:text-white transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/read" className="text-white/70 hover:text-white transition-colors">
                                Read
                            </Link>
                            <Link href="/write" className="text-white/70 hover:text-white transition-colors">
                                Write
                            </Link>
                            <Link href="/events" className="text-white font-medium">
                                Events
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <ChainSelector />
                        <ConnectButton showBalance />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Watch Events</h1>
                            <p className="text-white/50">Real-time ERC20 Transfer events</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-white/50">Current Block</p>
                            <p className="font-mono text-lg">{blockNumber?.toString() ?? '...'}</p>
                        </div>
                    </div>

                    {/* Token Selection */}
                    <div className="card mb-6">
                        <label className="block text-sm text-white/50 mb-2">Token Address</label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={tokenAddress}
                                onChange={(e) => {
                                    setTokenAddress(e.target.value);
                                    setIsWatching(false);
                                }}
                                placeholder="0x..."
                                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                            />
                            <button
                                onClick={handleToggleWatch}
                                disabled={!validTokenAddress}
                                className={`btn ${isWatching ? 'bg-red-500 hover:bg-red-600' : 'btn-primary'}`}
                            >
                                {isWatching ? 'Stop' : 'Watch'}
                            </button>
                        </div>

                        {/* Quick select */}
                        {quickTokens.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="text-sm text-white/50">Quick select:</span>
                                {quickTokens.map(([sym, token]) => (
                                    <button
                                        key={sym}
                                        onClick={() => handleQuickSelect(token.address, token.symbol, token.decimals)}
                                        className="px-3 py-1 text-sm bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                    >
                                        {sym}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status */}
                    {isWatching && (
                        <div className="card mb-6 flex items-center gap-3">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            <span>
                                Watching transfers for {symbol || 'token'}...
                            </span>
                        </div>
                    )}

                    {/* Events List */}
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">
                            Transfer Events
                            {events.length > 0 && (
                                <span className="ml-2 text-sm text-white/50">
                                    ({events.length} events)
                                </span>
                            )}
                        </h2>

                        {events.length === 0 ? (
                            <div className="text-center py-8 text-white/50">
                                {isWatching
                                    ? 'Waiting for events...'
                                    : 'Select a token and start watching to see events'}
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-auto">
                                {events.map((event, i) => (
                                    <div
                                        key={`${event.transactionHash}-${i}`}
                                        className="p-4 bg-white/5 rounded-lg border border-white/10"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-white/50">
                                                Block #{event.blockNumber.toString()}
                                            </span>
                                            <span className="text-sm font-medium text-green-400">
                                                +{formatBalance(event.value, decimals)} {symbol}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-white/50">From: </span>
                                                <AddressDisplay address={event.from} startChars={6} endChars={4} />
                                            </div>
                                            <div>
                                                <span className="text-white/50">To: </span>
                                                <AddressDisplay address={event.to} startChars={6} endChars={4} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
