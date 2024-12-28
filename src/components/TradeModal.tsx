"use client"

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from '@solana/wallet-adapter-react';
import { useJupiter } from '@jup-ag/react-hook';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogOverlay } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FaArrowsRotate, FaSpinner } from "react-icons/fa6";
import type { Token, SwapStatus } from "@/types/token";
import { fetchToken } from "@/lib/api";
import JSBI from 'jsbi';
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

// Constants
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const connection = new Connection(SOLANA_RPC);

interface TradeModalProps {
  token: Token | null;
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'buy' | 'sell';
}

const slippageOptions = [
  { label: '0.1%', value: 0.1 },
  { label: '0.5%', value: 0.5 },
  { label: '1%', value: 1 },
  { label: 'Custom', value: 'custom' }
];

const TradeModal: React.FC<TradeModalProps> = ({ token, isOpen, onClose, initialMode }) => {
  // State management
  const [mode, setMode] = useState<'buy' | 'sell'>(initialMode);
  const [amount, setAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<number | 'custom'>(0.5);
  const [customSlippage, setCustomSlippage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenData, setTokenData] = useState<Token | null>(token);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<SwapStatus>('idle');
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [hasTokenAccount, setHasTokenAccount] = useState<boolean>(false);
  const [isQuoteStale, setIsQuoteStale] = useState<boolean>(false);
  const USDC_DECIMALS = 6; // USDC has 6 decimal places

  // Hooks
  const { connected, publicKey, signTransaction } = useWallet();
  const { toast } = useToast();

  const amountInJSBI = useMemo(() => {
    if (!amount || !tokenData) return JSBI.BigInt(0);
    return JSBI.BigInt(Math.floor(Number(amount) * Math.pow(10, tokenData.decimals)));
  }, [amount, tokenData]);

  // Jupiter integration
  const {
    loading: routeLoading,
    exchange,
    quoteResponseMeta,
    error: jupiterError,
    refresh: refreshRoute
  } = useJupiter({
    amount: amountInJSBI,
    inputMint: mode === 'sell' ? new PublicKey(token?.mintAddress || '') : USDC_MINT,
    outputMint: mode === 'sell' ? USDC_MINT : new PublicKey(token?.mintAddress || ''),
    slippageBps: slippage === 'custom' 
      ? Number(customSlippage) * 100 
      : Number(slippage) * 100,
    debounceTime: 250,
  });

  // Effect for fetching fresh token data
  useEffect(() => {
    if (isOpen && token?.mintAddress) {
      const refreshTokenData = async () => {
        try {
          setIsLoading(true);
          const freshData = await fetchToken(token.mintAddress);
          setTokenData(freshData);
        } catch (error) {
          toast({
            title: "Warning",
            description: "Using cached token data due to refresh failure",
            variant: "destructive",
          });
          setTokenData(token);
        } finally {
          setIsLoading(false);
        }
      };
      refreshTokenData();
    }
  }, [isOpen, token?.mintAddress, toast]);

  
  
  // Add balance checking effect
  useEffect(() => {
    const checkBalances = async () => {
      if (!publicKey || !tokenData) return;

      try {
        // Check USDC balance
        const usdcAta = await getAssociatedTokenAddress(USDC_MINT, publicKey);
        try {
          const usdcAccount = await getAccount(connection, usdcAta);
          setUsdcBalance(Number(usdcAccount.amount) / Math.pow(10, USDC_DECIMALS));
        } catch (e) {
          setUsdcBalance(0);
        }

        // Check token balance and account existence
        const tokenMint = new PublicKey(tokenData.mintAddress);
        const tokenAta = await getAssociatedTokenAddress(tokenMint, publicKey);
        
        try {
          const tokenAccount = await getAccount(connection, tokenAta);
          setTokenBalance(Number(tokenAccount.amount) / Math.pow(10, tokenData.decimals));
          setHasTokenAccount(true);
        } catch (e) {
          setTokenBalance(0);
          setHasTokenAccount(false);
        }
      } catch (error) {
        console.error('Error checking balances:', error);
        toast({
          title: "Error",
          description: "Failed to fetch wallet balances",
          variant: "destructive",
        });
      }
    };

    if (isOpen) {
      checkBalances();
    }
  }, [publicKey, tokenData, isOpen, connection]);

   // Add quote staleness check
   useEffect(() => {
    if (!quoteResponseMeta?.quoteResponse) return;

    const checkStaleness = () => {
      const STALE_AFTER_MS = 30000; // 30 seconds
      const quoteAge = Date.now() - (quoteResponseMeta.quoteResponse.contextSlot * 400); // Approximate slot to time
      setIsQuoteStale(quoteAge > STALE_AFTER_MS);
    };

    checkStaleness();
    const interval = setInterval(checkStaleness, 1000);
    return () => clearInterval(interval);
  }, [quoteResponseMeta]);

  // Add max amount handler
  const handleMaxAmount = () => {
    if (!tokenData) return;
    
    if (mode === 'sell') {
      setAmount(tokenBalance.toString());
    } else {
      // For buying, use USDC balance
      const maxTokens = usdcBalance / (tokenData.priceUSD || 1);
      setAmount(maxTokens.toFixed(tokenData.decimals));
    }
  };

  // Swap details calculations
  const {
    outputAmount,
    priceImpact,
    minimumReceived,
    fee
  } = useMemo(() => {
    if (!quoteResponseMeta?.quoteResponse || !tokenData) {
      return { 
        outputAmount: 0, 
        priceImpact: 0, 
        minimumReceived: 0,
        fee: 0
      };
    }

    const { quoteResponse } = quoteResponseMeta;

    // Calculate output amount in decimals
    const outAmount = Number(JSBI.toNumber(quoteResponse.outAmount)) / 
      Math.pow(10, tokenData.decimals);

    // Get price impact directly from quote
    const impact = typeof quoteResponse.priceImpactPct === 'string' 
    ? parseFloat(quoteResponse.priceImpactPct) 
    : quoteResponse.priceImpactPct;

    // Calculate minimum received based on slippage
    const slippagePercent = slippage === 'custom' 
      ? Number(customSlippage) / 100 
      : Number(slippage) / 100;
    const minReceived = outAmount * (1 - slippagePercent);

    // Sum all fees from route plan
    const totalFees = quoteResponse.routePlan.reduce((acc, route) => {
      return acc + Number(JSBI.toNumber(route.swapInfo.feeAmount));
    }, 0) / LAMPORTS_PER_SOL;

    return { 
      outputAmount: outAmount, 
      priceImpact: impact,
      minimumReceived: minReceived,
      fee: totalFees
    };
  }, [quoteResponseMeta, tokenData, slippage, customSlippage]);

  // Handle transaction confirmation
  const confirmTransaction = async (signature: string) => {
    try {
      setSwapStatus('confirming');
      
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed: ' + confirmation.value.err.toString());
      }

      setSwapStatus('success');
      toast({
        title: "Trade successful",
        description: (
          <div className="flex flex-col gap-1">
            <span>{`${mode === 'buy' ? 'Bought' : 'Sold'} ${amount} ${tokenData?.symbol}`}</span>
            <a 
              href={`https://solscan.io/tx/${signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-400"
            >
              View on Solscan
            </a>
          </div>
        ),
      });
    } catch (error) {
      setSwapStatus('error');
      throw error;
    }
  };

  // Handle trade execution
  const handleTrade = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to continue.",
        variant: "destructive"
      });
      return;
    }

    // Add balance checks
    if (mode === 'sell') {
      if (Number(amount) > tokenBalance) {
        toast({
          title: "Insufficient balance",
          description: `You only have ${tokenBalance.toFixed(4)} ${tokenData?.symbol}`,
          variant: "destructive"
        });
        return;
      }
    } else {
      const requiredUsdc = Number(amount) * (tokenData?.priceUSD || 0);
      if (requiredUsdc > usdcBalance) {
        toast({
          title: "Insufficient USDC balance",
          description: `You need ${requiredUsdc.toFixed(2)} USDC but only have ${usdcBalance.toFixed(2)} USDC`,
          variant: "destructive"
        });
        return;
      }
    }

    if (!quoteResponseMeta?.quoteResponse) {
      toast({
        title: "No route available",
        description: "Unable to find a valid trading route.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSwapStatus('loading');
      
      if (priceImpact > 5) {
        const confirmed = window.confirm(
          `Warning: High price impact of ${priceImpact.toFixed(2)}%. Do you want to continue?`
        );
        if (!confirmed) {
          setSwapStatus('idle');
          return;
        }
      }

      const swapResult = await exchange({
        quoteResponseMeta,
        userPublicKey: publicKey,
        wallet: {
          signTransaction,
          signAllTransactions: async (txs) => {
            return Promise.all(txs.map(tx => signTransaction(tx)));
          }
        },
        asLegacyTransaction: false,
        wrapUnwrapSOL: true,
        prioritizationFeeLamports: "auto",
        // blockhashWithExpiryBlockheight,
        // feeAccount,
        // onTransaction,
        // computeUnisMicroLamports,
        // userSharedAccounts,
        // allowOptimizedWrappedSolTokenAccounts
      });

      if ('error' in swapResult && swapResult.error) {
        throw swapResult.error;
      }

      const signature = 'txid' in swapResult ? swapResult.txid : null;
      if (signature) {
        setTxSignature(signature);
        await confirmTransaction(signature);
      }

      onClose();
    } catch (error) {
      console.error('Trade error:', error);
      setSwapStatus('error');
      toast({
        title: "Trade failed",
        description: error instanceof Error ? error.message : "An error occurred while processing your trade.",
        variant: "destructive"
      });
    }
  };

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setSwapStatus('idle');
      setTxSignature(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <DialogContent className="fixed left-[50%] top-[50%] z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold text-center">
            {mode === 'buy' ? 'Buy' : 'Sell'} {tokenData?.symbol}
          </DialogTitle>
          <DialogDescription className="text-center mt-2">
            <div className="text-gray-400">
              {isLoading ? (
                <div className="animate-pulse">Loading price...</div>
              ) : (
                <>Current Price: ${tokenData?.priceUSD.toFixed(6)}</>
              )}
            </div>
            {tokenData && !isLoading && (
              <div className={`text-sm mt-1 ${tokenData.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {tokenData.change24h >= 0 ? '↑' : '↓'} {Math.abs(tokenData.change24h).toFixed(2)}% (24h)
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(value) => setMode(value as 'buy' | 'sell')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-4 rounded-lg bg-gray-800/50 p-1">
            <TabsTrigger
              value="buy"
              className={`rounded-md px-4 py-3 text-sm font-semibold transition-all
                ${mode === 'buy' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              Buy
            </TabsTrigger>
            <TabsTrigger
              value="sell"
              className={`rounded-md px-4 py-3 text-sm font-semibold transition-all
                ${mode === 'sell' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
            >
              Sell
            </TabsTrigger>
          </TabsList>

          <div className="mt-8 space-y-6">
            {/* Amount Input */}
            <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
                <label className="font-medium text-gray-200">Amount</label>
                <div className="text-gray-400">
                  Balance: {mode === 'sell' 
                    ? `${tokenBalance.toFixed(4)} ${tokenData?.symbol}`
                    : `${usdcBalance.toFixed(2)} USDC`}
                </div>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder={`Enter amount in ${tokenData?.symbol}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-24 bg-gray-800/50 border-gray-700 h-12"
                  disabled={swapStatus === 'loading' || swapStatus === 'confirming'}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMaxAmount}
                    className="h-6 px-2 text-xs"
                    disabled={swapStatus === 'loading' || swapStatus === 'confirming'}
                  >
                    MAX
                  </Button>
                  <span className="text-sm text-gray-400">
                    {mode === 'buy' ? 'USDC' : tokenData?.symbol}
                  </span>
                </div>
              </div>
              
              {/* Price and output information */}
              <div className="space-y-1 text-sm text-gray-400">
                <p>≈ ${(Number(amount) * (tokenData?.priceUSD || 0)).toFixed(2)} USD</p>
                {outputAmount > 0 && (
                  <>
                    <p>Expected output: {outputAmount.toFixed(6)} {mode === 'buy' ? tokenData?.symbol : 'USDC'}</p>
                    <p>Minimum received: {minimumReceived.toFixed(6)} {mode === 'buy' ? tokenData?.symbol : 'USDC'}</p>
                    <p>Price impact: <span className={priceImpact > 2 ? 'text-yellow-500' : 'text-gray-400'}>
                      {priceImpact.toFixed(2)}%
                    </span></p>
                    <p>Network fee: {fee.toFixed(6)} SOL</p>
                  </>
                )}
              </div>
            </div>

              {/* Quote Refresh Button - NEW */}
              {isQuoteStale && quoteResponseMeta?.quoteResponse && (
              <div className="flex items-center justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshRoute()}
                  className="text-xs flex items-center gap-2"
                >
                  <FaArrowsRotate className="w-3 h-3" />
                  Refresh Quote
                </Button>
              </div>
            )}

            {/* Token Account Warning - NEW */}
            {!hasTokenAccount && mode === 'buy' && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-500">
                  Note: A token account will be created for {tokenData?.symbol} with your first purchase
                </p>
              </div>
            )}

            {/* Slippage Settings */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">Slippage Tolerance</label>
              <Select
                value={String(slippage)}
                onValueChange={(value) => setSlippage(value === 'custom' ? 'custom' : Number(value))}
                disabled={swapStatus === 'loading' || swapStatus === 'confirming'}
              >
                <SelectTrigger className="h-12 bg-gray-800/50 border-gray-700">
                  <SelectValue placeholder="Select slippage" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {slippageOptions.map((option) => (
                    <SelectItem
                      key={option.label}
                      value={String(option.value)}
                      className="hover:bg-gray-700"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <AnimatePresence>
                {slippage === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <Input
                      type="number"
                      placeholder="Enter custom slippage %"
                      value={customSlippage}
                      onChange={(e) => setCustomSlippage(e.target.value)}
                      className="h-12 mt-2 bg-gray-800/50 border-gray-700"
                      disabled={swapStatus === 'loading' || swapStatus === 'confirming'}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Route Information */}
            {quoteResponseMeta?.quoteResponse?.routePlan && (
              <div className="p-3 bg-gray-800/30 rounded-lg space-y-1">
                <h4 className="text-sm font-medium text-gray-300">Route Info</h4>
                <div className="text-xs text-gray-400 space-y-0.5">
                  <div>Route: {quoteResponseMeta.quoteResponse.routePlan.map(route => route.swapInfo.label).join(' → ')}</div>
                  <div>Total Fee: {fee.toFixed(6)} SOL</div>
                </div>
              </div>
            )}

            {/* Warnings and Status */}
            {!connected && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-500">Please connect your wallet to trade</p>
              </div>
            )}

            {priceImpact > 2 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-500">
                  Warning: High price impact of {priceImpact.toFixed(2)}%. You may get significant slippage.
                </p>
              </div>
            )}

            {/* Trade Button */}
            <Button
              onClick={handleTrade}
              disabled={
                !connected || 
                swapStatus === 'loading' || 
                swapStatus === 'confirming' ||
                !quoteResponseMeta?.quoteResponse ||
                !amount ||
                Number(amount) <= 0
              }
              className={`w-full h-14 text-base font-semibold transition-colors relative ${
                mode === 'buy'
                  ? 'bg-green-500 hover:bg-green-600 disabled:bg-green-500/50'
                  : 'bg-red-500 hover:bg-red-600 disabled:bg-red-500/50'
              }`}
            >
              {swapStatus === 'loading' || swapStatus === 'confirming' ? (
                <div className="flex items-center justify-center gap-2">
                  <FaSpinner className="h-4 w-4 animate-spin" />
                  {swapStatus === 'loading' ? 'Preparing Transaction...' : 'Confirming...'}
                </div>
              ) : !connected ? (
                'Connect Wallet'
              ) : !quoteResponseMeta?.quoteResponse ? (
                'No Route Available'
              ) : !amount || Number(amount) <= 0 ? (
                'Enter Amount'
              ) : (
                `${mode === 'buy' ? 'Buy' : 'Sell'} ${tokenData?.symbol}`
              )}
            </Button>

            {/* Transaction Status */}
            {txSignature && (swapStatus === 'success' || swapStatus === 'error') && (
              <div className={`p-3 rounded-lg ${
                swapStatus === 'success' 
                  ? 'bg-green-500/10 border border-green-500/20' 
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${
                    swapStatus === 'success' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {swapStatus === 'success' ? 'Transaction Successful' : 'Transaction Failed'}
                  </span>
                  <a
                    href={`https://solscan.io/tx/${txSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:text-blue-400"
                  >
                    View on Solscan
                  </a>
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TradeModal;