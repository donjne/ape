// app/api/tokens/coingecko/route.ts
import type { NextRequest } from 'next/server';
import type { Token } from '@/types/token';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mintAddress = searchParams.get('mintAddress');

  console.log('GET request received for token metadata:', mintAddress);

  // Check if mintAddress is provided
  if (!mintAddress) {
    console.log('Invalid or missing mintAddress');
    return new Response(JSON.stringify({ error: 'Invalid or missing mintAddress' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.COINGECKO_API_KEY;

  if (!apiKey) {
    console.error('API Key not configured in environment variables');
    return new Response(JSON.stringify({ error: 'API Key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log(`Fetching token data from CoinGecko for mintAddress: ${mintAddress}`);
    
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/solana/contract/${mintAddress}?localization=false&x_cg_pro_api_key=${apiKey}`);

    console.log('Response from CoinGecko:', response.status, response.statusText);

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || '30'; // Default to 30 seconds if not specified
        console.warn(`Rate limit exceeded from CoinGecko. Retry after: ${retryAfter} seconds`);
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.', 
          retryAfter: parseInt(retryAfter, 10) 
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    console.log('Data received from CoinGecko:', JSON.stringify(data, null, 2));

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

    console.log('Token object constructed:', JSON.stringify(token, null, 2));

    return new Response(JSON.stringify(token), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetching token metadata:', error instanceof Error ? error.message : 'Unknown error');
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