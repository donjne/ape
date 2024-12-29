//app/api/tokens/route.ts
// @ts-nocheck
import { NextResponse } from 'next/server';
import { QuickNodeFunction } from '@/lib/quicknode/function';

const functionClient = new QuickNodeFunction(process.env.QUICKNODE_API_KEY!);

export async function GET() {
  try {
    const result = await functionClient.invokeFunction(
      process.env.QUICKNODE_FUNCTION_ID!,
      {
        user_data: { action: 'getTokens' },
        result_only: true
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}