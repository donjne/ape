"use client"
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDiscord, FaXTwitter } from "react-icons/fa6";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { FiMenu } from 'react-icons/fi';

interface SearchResult {
  address: string;
  name: string;
}

interface NavigationItem {
  label: string;
  href: string;
}

const Header: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  // const { connected } = useWallet();

  const handleSearch = async (query: string): Promise<void> => {
    setSearchQuery(query);
    // Mock search results - replace with actual API call
    if (query.length > 2) {
      const mockResults: SearchResult[] = [
        { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', name: 'SAMO' },
        { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USDC' }
      ];
      setSearchResults(mockResults);
    } else {
      setSearchResults([]);
    }
  };

  const navigationItems: NavigationItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Watchlist', href: '/watchlist' },
    { label: 'Docs', href: '/docs' },
    { label: 'Settings', href: '/settings' },
  ];

  return (
    <header className="bg-black/90 backdrop-blur-md border-b border-gray-800 fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <motion.h1 
            className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent"
            whileHover={{ scale: 1.05 }}
          >
            SwiftApe
          </motion.h1>
          
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg"
            >
              <FiMenu className="w-5 h-5" />
            </motion.button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-12 left-0 bg-gray-900 rounded-lg shadow-xl border border-gray-800 w-48"
                >
                  {navigationItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="block px-4 py-2 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex space-x-4 ml-4">
            <motion.a
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              href="https://discord.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-purple-500 transition-colors"
            >
              <FaDiscord className="w-5 h-5" />
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              href="https://x.com/heisdave7"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-400 transition-colors"
            >
              <FaXTwitter className="w-5 h-5" />
            </motion.a>
          </div>
        </div>

        {/* Middle section - Search */}
        <div className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search tokens or addresses..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-300 placeholder-gray-500"
            />
            
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-12 left-0 w-full bg-gray-900 rounded-lg shadow-xl border border-gray-800"
                >
                  {searchResults.map((result) => (
                    <div
                      key={result.address}
                      className="px-4 py-2 hover:bg-gray-800 cursor-pointer"
                    >
                      <div className="text-gray-300">{result.name}</div>
                      <div className="text-gray-500 text-sm">{result.address}</div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right section */}
        <div>
          <WalletMultiButton className="!bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg px-4 py-2 font-medium hover:opacity-90 transition-opacity" />
        </div>
      </div>
    </header>
  );
};

export default Header;