// app/api/tokens/coingecko/route.ts
import type { NextRequest } from 'next/server';
import type { Token } from '@/types/token'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mintAddress = searchParams.get('mintAddress');

  // Check if mintAddress is provided
  if (!mintAddress) {
    return new Response(JSON.stringify({ error: 'Invalid or missing mintAddress' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.COINGECKO_API_KEY; // Ensure this is set in your environment variables

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API Key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/solana/contract/${mintAddress}?localization=false&x_cg_pro_api_key=${apiKey}`);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Constructing the Token object according to the interface
    const token: Token = {
      mintAddress: mintAddress,
      name: data.name || '',
      symbol: data.symbol || '',
      age: 0, // Placeholder, update as needed
      decimals: 9, // Assuming default, update if data provides this
      createdAt: data.genesis_date ? new Date(data.genesis_date).getTime() / 1000 : 1,
      signature: '', // Placeholder, update if data provides this
      marketCap: data.market_data?.market_cap?.usd || 0,
      volume24h: data.market_data?.total_volume?.usd || 0,
      priceUSD: data.market_data?.current_price?.usd || 0,
      change24h: data.market_data?.price_change_percentage_24h || 0,
      links: {
        pump: `https://pump.fun/coin/${mintAddress}/`,
        telegram: data.links?.telegram_channel_identifier || '',
        twitter: data.links?.twitter_screen_name ? `https://twitter.com/${data.links.twitter_screen_name}` : '',
        website: data.links?.homepage?.[0] || ''
      }
    };

    return new Response(JSON.stringify(token), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}