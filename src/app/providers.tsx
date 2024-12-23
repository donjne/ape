// app/client-provider.tsx
'use client';

import dynamic from 'next/dynamic';

const Providers = dynamic(() => import('../components/AppProvider'), { ssr: false });

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}