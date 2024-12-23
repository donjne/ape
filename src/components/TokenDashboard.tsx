"use client"

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaDiscord, FaXTwitter, FaGlobe, FaCopy, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogOverlay } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";

interface Token {
  id: number;
  name: string;
  symbol: string;
  contractAddress: string;
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

interface TradeModalProps {
  token: Token | null;
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'buy' | 'sell';
}

const timeFilters = [
  { label: '7m', value: 7 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '6h', value: 360 },
  { label: '24h', value: 1440 }
];

const slippageOptions = [
  { label: '0.1%', value: 0.1 },
  { label: '0.5%', value: 0.5 },
  { label: '1%', value: 1 },
  { label: 'Custom', value: 'custom' }
];

const mockTokens: Token[] = [
  {
    id: 1,
    name: "Moon Rocket",
    symbol: "MOON",
    contractAddress: "0x1234567890abcdef1234567890abcdef12345678",
    age: 15,
    marketCap: 2500000,
    volume24h: 750000,
    priceUSD: 0.00125,
    change24h: 25.5,
    links: {
      pump: "https://pump.fun/token/moon",
      telegram: "https://t.me/moontoken",
      twitter: "https://twitter.com/moontoken",
      website: "https://moontoken.com"
    }
  },
  {
    id: 2,
    name: "Solar Flare",
    symbol: "FLARE",
    contractAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    age: 45,
    marketCap: 5800000,
    volume24h: 1200000,
    priceUSD: 0.00342,
    change24h: -12.3,
    links: {
      pump: "https://pump.fun/token/flare",
      telegram: "https://t.me/flaretoken",
      twitter: "https://twitter.com/flaretoken",
      website: "https://flaretoken.com"
    }
  },
  {
    id: 3,
    name: "Star Dust",
    symbol: "DUST",
    contractAddress: "0x7890abcdef1234567890abcdef1234567890abcd",
    age: 180,
    marketCap: 12500000,
    volume24h: 3200000,
    priceUSD: 0.00892,
    change24h: 8.7,
    links: {
      pump: "https://pump.fun/token/dust",
      telegram: "https://t.me/dusttoken",
      twitter: "https://twitter.com/dusttoken",
      website: "https://dusttoken.com"
    }
  }
];

const TradeModal: React.FC<TradeModalProps> = ({ token, isOpen, onClose, initialMode }) => {
    const [mode, setMode] = useState<'buy' | 'sell'>(initialMode);
    const [amount, setAmount] = useState<string>('');
    const [slippage, setSlippage] = useState<number | 'custom'>(0.5);
    const [customSlippage, setCustomSlippage] = useState<string>('');
    const { connected } = useWallet();
    const { toast } = useToast();
  
    const handleTrade = async () => {
      if (!connected) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to continue.",
          variant: "destructive"
        });
        return;
      }
  
      if (!amount || Number(amount) <= 0) {
        toast({
          title: "Invalid amount",
          description: "Please enter a valid amount to trade.",
          variant: "destructive"
        });
        return;
      }
  
      try {
        // Implement your trade logic here
        toast({
          title: "Trade submitted",
          description: `${mode === 'buy' ? 'Buying' : 'Selling'} ${amount} ${token?.symbol}`,
        });
        onClose();
      } catch (error) {
        toast({
          title: "Trade failed",
          description: "An error occurred while processing your trade.",
          variant: "destructive"
        });
      }
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <DialogContent className="fixed left-[50%] top-[50%] z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold text-center">
              {mode === 'buy' ? 'Buy' : 'Sell'} {token?.symbol}
            </DialogTitle>
            <DialogDescription className="text-center mt-2">
                <div className="text-gray-400">
                    Current Price: ${token?.priceUSD.toFixed(6)}
                </div>
                {token && (
                    <div className={`text-sm mt-1 ${token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {token.change24h >= 0 ? '↑' : '↓'} {Math.abs(token.change24h).toFixed(2)}% (24h)
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Amount</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={`Enter amount in ${token?.symbol}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-24 bg-gray-800/50 border-gray-700 h-12"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAmount('0.5')}
                      className="h-6 px-2 text-xs"
                    >
                      50%
                    </Button>
                    <span className="text-sm text-gray-400">{token?.symbol}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  ≈ ${(Number(amount) * (token?.priceUSD || 0)).toFixed(2)} USD
                </p>
              </div>
  
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Slippage Tolerance</label>
                <Select
                  value={String(slippage)}
                  onValueChange={(value) => setSlippage(value === 'custom' ? 'custom' : Number(value))}
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
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
  
              <Button
                onClick={handleTrade}
                className={`w-full h-14 text-base font-semibold transition-colors ${
                  mode === 'buy'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {!connected
                  ? 'Connect Wallet'
                  : `${mode === 'buy' ? 'Buy' : 'Sell'} ${token?.symbol}`}
              </Button>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
};
  

const TokenDashboard: React.FC = () => {
    const [selectedTimeFilter, setSelectedTimeFilter] = useState<number>(1440);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedToken, setSelectedToken] = useState<Token | null>(null);
    const [isTradeModalOpen, setIsTradeModalOpen] = useState<boolean>(false);
    const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{
      key: keyof Token;
      direction: 'asc' | 'desc';
    }>({ key: 'age', direction: 'asc' });
    const { toast } = useToast();
  
    const ITEMS_PER_PAGE = 10;
  
    const formatAge = (ageInMinutes: number): string => {
      if (ageInMinutes < 1) return `${Math.floor(ageInMinutes * 60)}s`;
      if (ageInMinutes < 60) return `${Math.floor(ageInMinutes)}m`;
      if (ageInMinutes < 1440) return `${Math.floor(ageInMinutes / 60)}h`;
      return `${Math.floor(ageInMinutes / 1440)}d`;
    };
  
    const formatNumber = (num: number): string => {
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
      return `$${num.toFixed(2)}`;
    };
  
    const handleCopyAddress = (address: string) => {
      navigator.clipboard.writeText(address);
      toast({
        title: "Address copied",
        description: "Contract address copied to clipboard",
      });
    };
  
    const handleSort = (key: keyof Token) => {
      setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    };
  
    const filteredAndSortedTokens = React.useMemo(() => {
      let filtered = mockTokens.filter(token =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.contractAddress.toLowerCase().includes(searchQuery.toLowerCase())
      );
  
      if (selectedTimeFilter) {
        filtered = filtered.filter(token => token.age <= selectedTimeFilter);
      }
  
      return filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });
    }, [searchQuery, selectedTimeFilter, sortConfig]);
  
    const totalPages = Math.ceil(filteredAndSortedTokens.length / ITEMS_PER_PAGE);
    const paginatedTokens = React.useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedTokens.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      }, [currentPage, filteredAndSortedTokens]);
    
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
                    <TableHead className="w-16">S/N</TableHead>
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
                  {paginatedTokens.map((token) => (
                    <TableRow key={token.id} className="hover:bg-gray-800/50">
                      <TableCell>{token.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{token.name}</span>
                            <Badge variant="outline">{token.symbol}</Badge>
                            <button
                              onClick={() => handleCopyAddress(token.contractAddress)}
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
                            className={
                            clsx(
                                "font-medium",
                                token.change24h >= 0 ? "text-green-500" : "text-red-500"
                            )
                            }
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