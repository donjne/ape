// app/api/tokens/jupiter/route.ts
import type { NextRequest } from 'next/server';
import type { Token } from '@/types/token';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mintAddress = searchParams.get('mintAddress');

  console.log('GET request received for token metadata via Jupiter:', mintAddress);

  if (!mintAddress) {
    console.log('Invalid or missing mintAddress');
    return new Response(JSON.stringify({ error: 'Invalid or missing mintAddress' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('Fetching token list from Jupiter API...');
    const response = await fetch('https://quote-api.jup.ag/v6/tokens', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error('Jupiter API response not OK:', response.status, response.statusText);
      throw new Error(`Jupiter API request failed with status ${response.status}`);
    }

    console.log('Jupiter API response received');
    const tokens = await response.json() as unknown as Token[]; // Casting to Token[] for type safety

    console.log(`Received ${tokens.length} tokens from Jupiter API`);
    
    const token = tokens.find(t => t.mintAddress === mintAddress);

    if (!token) {
      console.log('Token not found for mint address:', mintAddress);
      return new Response(JSON.stringify({ error: 'Token not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Token found:', JSON.stringify(token, null, 2));

    // Constructing the Token object with available data from Jupiter
    const tokenResponse: Token = {
      mintAddress: token.mintAddress,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals || 9, // Assuming decimals exist in Jupiter's token structure
      // Fields not provided by Jupiter are given defaults
      age: 0,
      createdAt: 1,
      signature: '',
      marketCap: 0,
      volume24h: 0,
      priceUSD: 0,
      change24h: 0,
      links: {
        pump: '',
        telegram: '',
        twitter: '',
        website: ''
      }
    };

    return new Response(JSON.stringify(tokenResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching token metadata from Jupiter:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(JSON.stringify({ error: 'An error occurred while fetching token details' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}