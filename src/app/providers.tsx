// app/client-provider.tsx
'use client';

import dynamic from 'next/dynamic';
import { Connection } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { JupiterProvider } from '@jup-ag/react-hook';

const Providers = dynamic(() => import('../components/AppProvider'), { ssr: false });

// Create connection outside of component to avoid recreation
const connection = new Connection('https://api.mainnet-beta.solana.com');

function JupiterWrapper({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWallet();

  return (
    <JupiterProvider
      connection={connection}
      userPublicKey={publicKey || undefined}
    >
      {children}
    </JupiterProvider>
  );
}

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <JupiterWrapper>
        {children}
      </JupiterWrapper>
    </Providers>
  );
}