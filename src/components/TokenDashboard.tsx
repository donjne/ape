"use client"

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaDiscord, FaXTwitter, FaGlobe, FaCopy, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";
import { fetchTokens, fetchToken } from '@/lib/api';
import { pusherClient } from '@/lib/pusher'
import type { Token, SortDirection } from "@/types/token";
import TradeModal from './TradeModal';
import { TableSkeleton } from '@/components/TableSkeleton';
import { io, Socket } from "socket.io-client";
// import { Connection, PublicKey } from "@solana/web3.js";
// import { Metadata } from '@metaplex-foundation/mpl-token-metadata';

async function fetchTokenDetailsFromAPI(mintAddress: string): Promise<Token> {
  const apiKey = process.env.NEXT_PUBLIC_COINGECKO_KEY; // Replace with your actual API key
  const response = await fetch(`https://api.coingecko.com/api/v3/coins/solana/contract/${mintAddress}?localization=false&x_cg_pro_api_key=${apiKey}`);
  
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = await response.json();

  return {
    mintAddress: mintAddress,
    name: data.name,
    symbol: data.symbol,
    age: 0, // We'll update this later
    decimals: 9,
    createdAt: 1,
    signature: '',
    marketCap: data.market_data.market_cap.usd,
    volume24h: data.market_data.total_volume.usd,
    priceUSD: data.market_data.current_price.usd,
    change24h: data.market_data.price_change_percentage_24h,
    links: {
      pump: `https://pump.fun/coin/${mintAddress}/`, // Fill in with actual links if available
      telegram: data.links.telegram_channel_identifier || '',
      twitter: data.links.twitter_screen_name ? `https://twitter.com/${data.links.twitter_screen_name}` : '',
      website: data.links.homepage[0] || ''
    }
  };
}


// async function getTokenDetails(mintAddress: string): Promise<{ name: string, symbol: string }> {
//   try {
//     const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed'); // 'confirmed' for better performance
//     const mintPublicKey = new PublicKey(mintAddress);
    
//     // Get the Program Derived Address (PDA) for the metadata
//     const metadataPDA = await Metadata.getPDA(mintPublicKey);
    
//     // Load the metadata account
//     const metadataAccount = await Metadata.load(connection, metadataPDA);

//     // Check if metadata exists
//     if (!metadataAccount || !metadataAccount.data) {
//       throw new Error('Metadata not found for the given token mint address');
//     }

//     return {
//       name: metadataAccount.data.name,
//       symbol: metadataAccount.data.symbol
//     };
//   } catch (error) {
//     console.error('Error fetching token details:', error);
//     // Return a default or throw an error, based on your application's needs
//     throw new Error('Failed to retrieve token details');
//   }
// }

function calculateTokenAge(createdAt: number): number {
  if (!createdAt) return 0;
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const ageInSeconds = now - createdAt;
  
  if (ageInSeconds < 60) return ageInSeconds;
  if (ageInSeconds < 3600) return Math.floor(ageInSeconds / 60);
  if (ageInSeconds < 86400) return Math.floor(ageInSeconds / 3600);
  return Math.floor(ageInSeconds / 86400);
}

const timeFilters = [
  { label: '7m', value: 7 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '6h', value: 360 },
  { label: '24h', value: 1440 }
];

// Create an EventSource instance at module level to avoid multiple connections
// let eventSource: EventSource | null = null;

interface SortConfig {
  key: keyof Token;
  direction: SortDirection;
}

interface TokenHistoricalData {
  mintAddress: string;
  timestamp: number; // Unix timestamp
  priceUSD: number;
}


const TokenDashboard: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<number>(1440);
  const [historicalData, setHistoricalData] = useState<TokenHistoricalData[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState<boolean>(false);
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'age',
    direction: 'asc'
  });
  const { toast } = useToast();

  function storePriceData(token: Token, price: number) {
    const data: TokenHistoricalData = {
      mintAddress: token.mintAddress,
      timestamp: Math.floor(Date.now() / 1000),
      priceUSD: price
    };
  
    // Update state with new historical data
    setHistoricalData(prevData => [...prevData, data]);
  }

  // To calculate 24-hour change:
function calculate24hChange(token: Token): number {
  const now = Math.floor(Date.now() / 1000);
  const priceToday = token.priceUSD;
  
  // Find the price from 24 hours ago
  const price24hAgoData = historicalData.find(data => 
    data.mintAddress === token.mintAddress 
    && now - data.timestamp >= 24 * 60 * 60 
    && now - data.timestamp < 24 * 60 * 60 + 60 // Allow for some leeway in data collection time
  );

  if (!price24hAgoData) {
    console.warn('No price data from 24 hours ago for:', token.mintAddress);
    return 0; // Or handle this case differently
  }

  const price24hAgo = price24hAgoData.priceUSD;
  return ((priceToday - price24hAgo) / price24hAgo) * 100;
}

  useEffect(() => {
  // When we receive new price data, we store it
  tokens.forEach(token => {
    storePriceData(token, token.priceUSD);
  });

  // Update token with 24h change
  const updatedTokens = tokens.map(token => {
    return {
      ...token,
      change24h: calculate24hChange(token)
    };
  });

  setTokens(updatedTokens);
}, [tokens]); // This effect runs whenever tokens change



  // useEffect(() => {
  //   const fetchAndUpdateTokens = async () => {
  //     try {
  //       setLoading(true);
  //       const newTokens = await Promise.all(tokens.map(async (token) => {
  //         const details = await fetchTokenDetailsFromAPI(token.mintAddress);
  //         return {
  //           ...token,
  //           ...details,
  //           age: calculateTokenAge(token.createdAt) // Assuming createdAt is available from your initial data
  //         };
  //       }));
  //       setTokens(newTokens);
  //     } catch (error) {
  //       console.error('Failed to fetch token details:', error);
  //       setError('Error fetching token details');
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  
  //   fetchAndUpdateTokens();
  // }, [tokens]);

  // Fetch initial data
  // useEffect(() => {
  //   const loadTokens = async () => {
  //     try {
  //       setLoading(true);
  //       setError(null);
  //       const data = await fetchTokens();
  //       setTokens(data);
  //     } catch (err) {
  //       setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
  //       toast({
  //         title: 'Error',
  //         description: 'Failed to fetch tokens',
  //         variant: 'destructive',
  //       });
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   loadTokens();
  // }, [toast]);

    // Initial data load
    useEffect(() => {
      const loadTokens = async () => {
        try {
          setLoading(true);
          setError(null);
          const initialTokens = await fetchTokens();
          const enhancedTokens = await Promise.all(
            initialTokens.map(async (token) => {
              try {
                const details = await fetchTokenDetailsFromAPI(token.mintAddress);
                return {
                  ...token,
                  ...details,
                  age: calculateTokenAge(token.createdAt),
                };
              } catch (error) {
                console.error(`Failed to fetch details for ${token.mintAddress}:`, error);
                return token;
              }
            })
          );
          setTokens(enhancedTokens);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
          toast({
            title: 'Error',
            description: 'Failed to fetch tokens',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };
  
      loadTokens();
    }, []);
  
    // Pusher real-time updates
    useEffect(() => {
      const channel = pusherClient.subscribe('tokens-channel');
  
      channel.bind('new-token', async (newToken: Token) => {
        try {
          // Fetch additional details for the new token
          const details = await fetchTokenDetailsFromAPI(newToken.mintAddress);
          
          setTokens(prevTokens => {
            const exists = prevTokens.some(t => t.mintAddress === newToken.mintAddress);
            if (exists) return prevTokens;
            
            const enhancedToken = {
              ...newToken,
              ...details,
              age: calculateTokenAge(newToken.createdAt)
            };
            
            toast({
              title: 'New Token',
              description: `New token detected: ${enhancedToken.symbol}`,
            });
            
            return [enhancedToken, ...prevTokens];
          });
        } catch (err) {
          console.error('Error processing new token:', err);
          toast({
            title: 'Error',
            description: 'Failed to process new token',
            variant: 'destructive',
          });
        }
      });
  
      return () => {
        channel.unbind_all();
        pusherClient.unsubscribe('tokens-channel');
      };
    }, []);


  // USING PUSHER
  // useEffect(() => {
  //   const channel = pusherClient.subscribe('tokens-channel')

  //   channel.bind('new-token', (newToken: Token) => {
  //     try {
  //       setTokens(prevTokens => {
  //         const exists = prevTokens.some(t => t.mintAddress === newToken.mintAddress)
  //         if (exists) return prevTokens
          
  //         const tokenWithAge = {
  //           ...newToken,
  //           age: calculateTokenAge(newToken.createdAt)
  //         }
          
  //         toast({
  //           title: 'New Token',
  //           description: `New token detected: ${tokenWithAge.symbol}`,
  //         })
          
  //         return [tokenWithAge, ...prevTokens]
  //       })
  //     } catch (err) {
  //       console.error('Error processing new token:', err)
  //     }
  //   })

  //   // Cleanup
  //   return () => {
  //     channel.unbind_all()
  //     pusherClient.unsubscribe('tokens-channel')
  //   }
  // }, [])

    // Initialize Socket.IO connection
    // useEffect(() => {
    //   const socketInstance = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL || '', {
    //     reconnectionDelay: 1000,
    //     reconnection: true,
    //     reconnectionAttempts: 10,
    //     transports: ['websocket'],
    //     agent: false,
    //     upgrade: false,
    //     rejectUnauthorized: false
    //   });
  
    //   socketInstance.on('connect', () => {
    //     console.log('Connected to WebSocket');
    //   });
  
    //   socketInstance.on('disconnect', () => {
    //     console.log('Disconnected from WebSocket');
    //   });
  
    //   socketInstance.on('newToken', (newToken: Token) => {
    //     try {
    //       setTokens(prevTokens => {
    //         // Check if token already exists
    //         const exists = prevTokens.some(t => t.mintAddress === newToken.mintAddress);
    //         if (exists) return prevTokens;
            
    //         // Add new token with enhanced data
    //         const tokenWithAge = {
    //           ...newToken,
    //           age: calculateTokenAge(newToken.createdAt)
    //         };
            
    //         // Show notification
    //         toast({
    //           title: 'New Token',
    //           description: `New token detected: ${tokenWithAge.symbol}`,
    //         });
            
    //         return [tokenWithAge, ...prevTokens];
    //       });
    //     } catch (err) {
    //       console.error('Error processing new token:', err);
    //     }
    //   });
  
    //   socketInstance.on('tokenUpdate', (updatedToken: Token) => {
    //     setTokens(prevTokens => 
    //       prevTokens.map(token => 
    //         token.mintAddress === updatedToken.mintAddress 
    //           ? { ...token, ...updatedToken, age: calculateTokenAge(updatedToken.createdAt) }
    //           : token
    //       )
    //     );
    //   });
  
    //   socketInstance.on('error', (error: Error) => {
    //     console.error('Socket error:', error);
    //     toast({
    //       title: 'Connection Error',
    //       description: 'Failed to connect to real-time updates',
    //       variant: 'destructive',
    //     });
    //   });
  
    //   setSocket(socketInstance);
  
    //   // Cleanup on unmount
    //   return () => {
    //     socketInstance.disconnect();
    //   };
    // }, []);

  // Fetch initial data
//   useEffect(() => {
//   const loadTokens = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       const initialTokens = await fetchTokens(); // Fetch basic tokens first
//       const enhancedTokens = await Promise.all(initialTokens.map(async (token) => {
//         try {
//           // Fetch detailed data for each token from CoinGecko
//           const details = await fetchTokenDetailsFromAPI(token.mintAddress);
//           return {
//             ...token,
//             ...details,
//             age: calculateTokenAge(token.createdAt), // Assuming createdAt is already set
//           };
//         } catch (error) {
//           console.error(`Failed to fetch details for ${token.mintAddress}:`, error);
//           return token; // Keep the original token data if fetching details fails
//         }
//       }));
//       setTokens(enhancedTokens);
//     } catch (err) {
//       setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
//       toast({
//         title: 'Error',
//         description: 'Failed to fetch tokens',
//         variant: 'destructive',
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   loadTokens();
// }, [toast]);

  // Set up real-time updates
  // useEffect(() => {
  //   if (typeof window === 'undefined') return;

    // const setupEventSource = () => {
    //   eventSource = new EventSource('/api/tokens/stream');

      // eventSource.onmessage = (event) => {
      //   try {
      //     const newToken = JSON.parse(event.data) as Token;
      //     setTokens(prevTokens => {
      //       // Check if token already exists
      //       const exists = prevTokens.some(t => t.mintAddress === newToken.mintAddress);
      //       if (exists) return prevTokens;
            
      //       // Add new token to the beginning of the list
      //       return [newToken, ...prevTokens];
      //     });

      //     // Show notification
      //     toast({
      //       title: 'New Token',
      //       description: `New token detected: ${newToken.symbol}`,
      //     });
      //   } catch (err) {
      //     console.error('Error processing token update:', err);
      //   }
      // };

      // eventSource.onmessage = (event) => {
      //   try {
      //     const newToken = JSON.parse(event.data) as Token;
      //     fetchTokenDetailsFromAPI(newToken.mintAddress).then(details => {
      //       setTokens(prevTokens => {
      //         const exists = prevTokens.some(t => t.mintAddress === newToken.mintAddress);
      //         if (exists) return prevTokens;
              
      //         return [{ ...newToken, ...details, age: calculateTokenAge(newToken.createdAt) }, ...prevTokens];
      //       });
      //     }).catch(error => {
      //       console.error('Failed to fetch details for new token:', error);
      //       setTokens(prevTokens => {
      //         const exists = prevTokens.some(t => t.mintAddress === newToken.mintAddress);
      //         if (exists) return prevTokens;
      //         return [newToken, ...prevTokens]; // Use the basic data if fetching details fails
      //       });
      //     });
      
      //     toast({
      //       title: 'New Token',
      //       description: `New token detected: ${newToken.symbol}`,
      //     });
      //   } catch (err) {
      //     console.error('Error processing token update:', err);
      //   }
      // };

  //     eventSource.onerror = (error) => {
  //       console.error('EventSource error:', error);
  //       eventSource?.close();
  //       // Attempt to reconnect after 5 seconds
  //       setTimeout(setupEventSource, 5000);
  //     };
  //   };

  //   setupEventSource();

  //   // Cleanup
  //   return () => {
  //     eventSource?.close();
  //     eventSource = null;
  //   };
  // }, [toast]);

  // Filter tokens based on search and time
  const filteredTokens = React.useMemo(() => {
    return tokens.filter(token => {
      // Search filter
      const searchMatch = 
        token.mintAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Time filter
      const ageMatch = token.age <= selectedTimeFilter;

      return searchMatch && ageMatch;
    });
  }, [tokens, searchQuery, selectedTimeFilter]);

  const ITEMS_PER_PAGE = 10;

  // Render loading state
  if (loading) {
    return <TableSkeleton />;
  }

  // Render error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-center">
          <h2 className="text-lg font-semibold text-red-500">Error Loading Tokens</h2>
          <p className="text-gray-400 mt-2">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const formatAge = (ageInSeconds: number): string => {
    if (ageInSeconds < 60) return `${ageInSeconds}s`;
    if (ageInSeconds < 3600) return `${Math.floor(ageInSeconds / 60)}m`;
    if (ageInSeconds < 86400) return `${Math.floor(ageInSeconds / 3600)}h`;
    return `${Math.floor(ageInSeconds / 86400)}d`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const handleTokenClick = async (mintAddress: string) => {
    try {
      setLoading(true);
      const tokenData = await fetchTokenDetailsFromAPI(mintAddress);
      
      // Update this specific token in our list
      setTokens(prevTokens => 
        prevTokens.map(t => 
          t.mintAddress === mintAddress ? tokenData : t
        )
      );
  
      // Open the trade modal with fresh data
      setSelectedToken(tokenData);
      setTradeMode('buy');  // or keep previous mode
      setIsTradeModalOpen(true);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch token details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address copied",
      description: "Token address copied to clipboard",
    });
  };

  const handleSort = (key: keyof Token) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedTokens = React.useMemo(() => {
    return [...filteredTokens].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return 0;
    });
  }, [filteredTokens, sortConfig]);

  const totalPages = Math.ceil(sortedTokens.length / ITEMS_PER_PAGE);
  const paginatedTokens = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTokens.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, sortedTokens]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          New Tokens
        </h1>
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto">
          Real-time feed of tokens launched on your favorite DEXs in the past 24hrs
        </p>
      </motion.div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <div className="relative max-w-xl mx-auto">
          <Input
            type="text"
            placeholder="Search by token name, symbol, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12"
          />
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {timeFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={selectedTimeFilter === filter.value ? "default" : "outline"}
              onClick={() => setSelectedTimeFilter(filter.value)}
              size="sm"
              className="min-w-[60px]"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tokens Table */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead 
                  className="min-w-[200px] cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  Token {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('age')}
                >
                  Age {sortConfig.key === 'age' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('marketCap')}
                >
                  Mkt Cap {sortConfig.key === 'marketCap' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('volume24h')}
                >
                  24h Volume {sortConfig.key === 'volume24h' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('priceUSD')}
                >
                  Price/USD {sortConfig.key === 'priceUSD' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer"
                  onClick={() => handleSort('change24h')}
                >
                  24h Change {sortConfig.key === 'change24h' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTokens.map((token, index) => (
                <TableRow key={token.mintAddress} className="hover:bg-gray-800/50">
                  <TableCell>{index + 1 + (currentPage - 1) * ITEMS_PER_PAGE}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <button
                        onClick={() => handleTokenClick(token.mintAddress)}
                        className="font-medium hover:text-purple-400 transition-colors text-left"
                        >
                        <span>{token.name}</span>
                        <Badge variant="outline" className="ml-2">{token.symbol}</Badge>
                        </button>
                        <button
                          onClick={() => handleCopyAddress(token.mintAddress)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <FaCopy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <a
                          href={token.links.pump}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-purple-400 transition-colors"
                        >
                          <Image 
                            src="/pump-icon.svg" 
                            alt="Pump" 
                            width={16} 
                            height={16} 
                            className="w-4 h-4" 
                          />
                        </a>
                        <a
                          href={token.links.telegram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-400 transition-colors"
                        >
                          <FaDiscord className="w-4 h-4" />
                        </a>
                        <a
                          href={token.links.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                        >
                          <FaXTwitter className="w-4 h-4" />
                        </a>
                        <a
                          href={token.links.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-green-400 transition-colors"
                        >
                          <FaGlobe className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatAge(token.age)}</TableCell>
                  <TableCell>{formatNumber(token.marketCap)}</TableCell>
                  <TableCell>{formatNumber(token.volume24h)}</TableCell>
                  <TableCell>${token.priceUSD.toFixed(6)}</TableCell>
                  <TableCell>
                    <span 
                      className={clsx(
                        "font-medium",
                        token.change24h >= 0 ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {token.change24h >= 0 ? '↑' : '↓'} 
                      {Math.abs(token.change24h).toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedToken(token);
                          setTradeMode('buy');
                          setIsTradeModalOpen(true);
                        }}
                        className="bg-green-500 hover:bg-green-600 whitespace-nowrap"
                      >
                        Buy
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedToken(token);
                          setTradeMode('sell');
                          setIsTradeModalOpen(true);
                        }}
                        className="whitespace-nowrap"
                      >
                        Sell
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <FaChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <FaChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Trade Modal */}
      <TradeModal
        token={selectedToken}
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        initialMode={tradeMode}
      />
    </div>
  );
};

export default TokenDashboard;