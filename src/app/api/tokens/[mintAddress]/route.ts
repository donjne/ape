// app/api/tokens/[mintAddress]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { QuickNodeFunction } from '@/lib/quicknode/function';

const functionClient = new QuickNodeFunction(process.env.QUICKNODE_API_KEY!);

type Props = {
  params: {
    mintAddress: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: Props
) {
  const { mintAddress } = params;

  try {
    const result = await functionClient.invokeFunction(
      process.env.QUICKNODE_FUNCTION_ID!,
      {
        user_data: {
          action: 'getToken',
          mintAddress: mintAddress,
        },
        result_only: true,
      }
    );

    if (!result) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching token:', error);
    return NextResponse.json({ error: 'Failed to fetch token' }, { status: 500 });
  }
}


