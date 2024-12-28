// export interface Token {
//   id: number;
//   name: string;
//   symbol: string;
//   mintAddress: string;
//   age: number;
//   marketCap: number;
//   volume24h: number;
//   priceUSD: number;
//   change24h: number;
//   links: {
//     pump: string;
//     telegram: string;
//     twitter: string;
//     website: string;
//   };
// }

// export interface Token {
//     mintAddress: string;
//     name: string;
//     symbol: string;
//     createdAt: number;
//     signature: string;
//     age: number;
//     marketCap: number;
//     volume24h: number;
//     priceUSD: number;
//     change24h: number;
//     links: {
//       pump: string;
//       telegram: string;
//       twitter: string;
//       website: string;
//     };
//   }

export interface Token {
  mintAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  createdAt: number;
  signature: string;
  age: number;
  marketCap: number;
  volume24h: number;
  priceUSD: number;
  change24h: number;
  links: {
    pump: string;
    telegram: string;
    twitter: string;
    website: string;
  };
}

export type SwapStatus = 'idle' | 'loading' | 'confirming' | 'success' | 'error';

  export interface TokenStats {
    holders: number;
    transfers24h: number;
    liquidityUSD: number;
    fullyDilutedValue: number;
  }
  
  export interface APIResponse<T> {
    data: T;
    error?: string;
    code?: string;
  }
  
  export type SortDirection = 'asc' | 'desc';
  
  export interface TokenFilters {
    minAge?: number;
    maxAge?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
    minVolume?: number;
    maxVolume?: number;
    verified?: boolean;
  }
  
  export interface PaginationParams {
    page: number;
    limit: number;
    sortBy?: keyof Token;
    sortDirection?: SortDirection;
    filters?: TokenFilters;
  }