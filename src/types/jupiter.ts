// types/jupiter.d.ts
import { PublicKey } from '@solana/web3.js';
import JSBI from 'jsbi';

export interface SwapInfo {
  inputMint: string;
  inAmount: JSBI;
  outputMint: string;
  outAmount: JSBI;
  ammKey: PublicKey;
  label: string;
  feeAmount: JSBI;
  feeMint: PublicKey;
}

export interface RoutePlan {
  swapInfo: SwapInfo;
  percent: number;
}

export interface QuoteResponseMeta {
  quoteResponse: {
    routePlan: RoutePlan[];
    outAmount: JSBI;
    inAmount: JSBI;
    inputMint: string;
    outputMint: string;
    otherAmountThreshold: JSBI;
    slippageBps: number;
    priceImpactPct: number;
    contextSlot: number;
    swapMode: string;
  };
}

export interface SwapResult {
  txid: string;
  inputAddress: PublicKey;
  outputAddress: PublicKey;
  inputAmount: number;
  outputAmount: number;
  error?: Error;
}