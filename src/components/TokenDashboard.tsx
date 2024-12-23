"use client"
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaDiscord, FaXTwitter, FaGlobe, FaCopy } from "react-icons/fa6";
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Token {
  id: number;
  name: string;
  symbol: string;
  contractAddress: string;
  age: number;
  marketCap: number;
  volume24h: number;
  priceUSD: number;
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

const TradeModal: React.FC<TradeModalProps> = ({ token, isOpen, onClose, initialMode }) => {
    const [mode, setMode] = useState<'buy' | 'sell'>(initialMode);
    const [amount, setAmount] = useState<string>('');
    const [slippage, setSlippage] = useState<number | 'custom'>(0.5);
    const [customSlippage, setCustomSlippage] = useState<string>('');
    const { connected } = useWallet();

  const handleTrade = async () => {
    if (!connected) {
      // Show wallet connection message
      return;
    }
    // Implement trade logic here
    console.log(`${mode} ${amount} ${token?.symbol} with slippage ${slippage === 'custom' ? customSlippage : slippage}%`);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md border bg-gray-900/95 p-0 backdrop-blur-sm">
        <div className="p-6 space-y-6">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-bold text-center">
              {mode === 'buy' ? 'Buy' : 'Sell'} {token?.symbol}
            </DialogTitle>
            <DialogDescription className="text-center text-gray-400">
              Current Price: ${token?.priceUSD.toFixed(6)}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={mode} onValueChange={(value) => setMode(value as 'buy' | 'sell')} className="w-full">
            <TabsList className="grid grid-cols-2 gap-4 p-1 bg-gray-800/50 rounded-lg w-full">
              <TabsTrigger 
                value="buy"
                className={`py-2.5 text-sm font-semibold rounded-md transition-all
                  ${mode === 'buy' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Buy
              </TabsTrigger>
              <TabsTrigger 
                value="sell"
                className={`py-2.5 text-sm font-semibold rounded-md transition-all
                  ${mode === 'sell' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Sell
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Amount</label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder={`Enter amount in ${token?.symbol}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-20 bg-gray-800/50 border-gray-700"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {token?.symbol}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  ≈ ${(Number(amount) * (token?.priceUSD || 0)).toFixed(2)} USD
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200">Slippage Tolerance</label>
                <Select 
                  value={String(slippage)} 
                  onValueChange={(value) => setSlippage(value === 'custom' ? 'custom' : Number(value))}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-700">
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
                    >
                      <Input
                        type="number"
                        placeholder="Enter custom slippage %"
                        value={customSlippage}
                        onChange={(e) => setCustomSlippage(e.target.value)}
                        className="mt-2 bg-gray-800/50 border-gray-700"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button 
                onClick={handleTrade} 
                className={`w-full py-6 text-base font-semibold ${
                  mode === 'buy' 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {!connected 
                  ? 'Connect Wallet' 
                  : `${mode === 'buy' ? 'Buy' : 'Sell'} ${token?.symbol}`
                }
              </Button>
            </div>
          </Tabs>
        </div>
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
      links: {
        pump: "https://pump.fun/token/moon",
        telegram: "https://t.me/moontoken",
        twitter: "https://twitter.com/moontoken",
        website: "https://moontoken.com"
      }
    },
    // Add more mock tokens here
  ];

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
    // Add toast notification here
  };

  const filteredTokens = mockTokens.filter(token => 
    token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.contractAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          New Tokens
        </h1>
        <p className="text-gray-400 text-lg">
          Real-time feed of tokens launched on your favorite DEXs in the past 24hrs
        </p>
      </motion.div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <Input
          type="text"
          placeholder="Search by token name, symbol, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xl mx-auto"
        />

        <div className="flex justify-center gap-2">
          {timeFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={selectedTimeFilter === filter.value ? "default" : "outline"}
              onClick={() => setSelectedTimeFilter(filter.value)}
              size="sm"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tokens Table */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">S/N</TableHead>
              <TableHead>Token</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Mkt Cap</TableHead>
              <TableHead>24hrs Volume</TableHead>
              <TableHead>Price/USD</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTokens.map((token) => (
              <TableRow key={token.id}>
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
                <TableCell>{formatNumber(token.priceUSD)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedToken(token);
                        setTradeMode('buy');
                        setIsTradeModalOpen(true);
                      }}
                      className="bg-green-500 hover:bg-green-600"
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