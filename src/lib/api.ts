import { Token } from '@/types/token';

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new APIError(
      data.error || 'An error occurred',
      response.status,
      data.code
    );
  }

  return data;
}

export async function fetchTokens(): Promise<Token[]> {
  const response = await fetch('/api/tokens');
  const data = await handleResponse<{ tokens: Token[] }>(response);
  return data.tokens;
}

export async function fetchToken(mintAddress: string): Promise<Token> {
  const response = await fetch(`/api/tokens/${mintAddress}`);
  const data = await handleResponse<{ token: Token }>(response);
  return data.token;
}

// Function to validate mint address format
export function isValidMintAddress(address: string): boolean {
  // Basic Solana address validation
  return /^[0-9a-zA-Z]{32,44}$/.test(address);
}

// Retry function for failed requests
export async function retryRequest<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryRequest(fn, retries - 1, delay * 2);
  }
}