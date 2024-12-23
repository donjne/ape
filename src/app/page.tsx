// app/page.tsx
'use client';
import TokenDashboard from '@/components/TokenDashboard'

export default function Home() {
  return (
      <main className="pt-16"> {/* Add padding-top to account for fixed header */}
        {/* Your page content here */}
        <TokenDashboard />
      </main>
  );
}