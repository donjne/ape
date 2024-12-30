// // app/api/webhooks/quicknode/route.ts
// import { headers } from 'next/headers';
// import { NextRequest, NextResponse } from 'next/server';
// import { QuickNodeFunction } from '@/lib/quicknode/function';

// interface WebhookToken {
//   mintAddress: string;
//   createdAt: number;
//   signature: string;
//   decimals: number;
//   name: string;
//   symbol: string;
//   age: number;
//   marketCap: number;
//   volume24h: number;
//   priceUSD: number;
//   change24h: number;
//   links: {
//     pump: string;
//     telegram: string;
//     twitter: string;
//     website: string;
//   };
// }

// interface WebhookPayload {
//   blockTime: number;
//   newTokens: WebhookToken[];
// }

// const functionClient = new QuickNodeFunction(process.env.QUICKNODE_API_KEY!);

// export async function POST(request: NextRequest) {
//   try {
//     // Get security token from headers
//     const headersList = headers();
//     console.log('Received headers:', Object.fromEntries((await headersList).entries()));
    
//     const securityToken = (await headersList).get('x-api-key');
//     console.log('Security token:', securityToken);

//     // Validate security token
//     if (securityToken !== process.env.QUICKNODE_WEBHOOK_TOKEN) {
//       console.log('Token mismatch:', {
//         received: securityToken,
//         expected: process.env.QUICKNODE_WEBHOOK_TOKEN
//       });
//       return NextResponse.json(
//         { error: 'Invalid security token' },
//         { status: 401 }
//       );
//     }

//     // Get the raw request body
//     const rawBody = await request.text();
//     console.log('Raw webhook body:', rawBody);

//     const payload = rawBody ? (JSON.parse(rawBody) as WebhookPayload) : null;
//     console.log('Parsed payload:', payload);

//     if (!payload || !payload.newTokens) {
//       return NextResponse.json(
//         { error: 'Empty payload' },
//         { status: 400 }
//       );
//     }

//     const functionParams = {
//       stream_data: {
//         newTokens: payload.newTokens.map(token => ({
//           mintAddress: token.mintAddress,
//           createdAt: token.createdAt,
//           signature: token.signature
//         }))
//       },
//       result_only: true,
//       block_number: 0,
//       network: (await headersList).get('stream-network') || undefined,
//       dataset: (await headersList).get('stream-dataset') || undefined,
//     };

//     console.log('Exact function params:', JSON.stringify(functionParams, null, 2));

//     // Just pass the minimal required data that the function expects
//     const result = await functionClient.invokeFunction(
//       process.env.QUICKNODE_FUNCTION_ID!,
//       {
//         stream_data: functionParams.stream_data
//       }
      
//     );

//     console.log('Sending to function:', JSON.stringify({
//       stream_data: functionParams.stream_data
//     }, null, 2));

//     console.log('Function result:', result);
//     console.log('Complete function result:', JSON.stringify(result, null, 2));
//     return NextResponse.json({ success: true, result });
//   } catch (error) {
//     console.error('Error processing webhook:', error);
//     if (error instanceof Error) {
//       console.error('Error details:', {
//         message: error.message,
//         stack: error.stack
//       });
//     }
//     return NextResponse.json(
//       { error: 'Failed to process webhook' },
//       { status: 500 }
//     );
//   }
// }

// app/api/webhooks/quicknode/route.ts
// import { headers } from 'next/headers';
// import { NextRequest, NextResponse } from 'next/server';
// import { QuickNodeFunction } from '@/lib/quicknode/function';

// interface WebhookToken {
//   mintAddress: string;
//   createdAt: number;
//   signature: string;
// }

// interface WebhookPayload {
//   blockTime: number;
//   newTokens: WebhookToken[];
// }

// const functionClient = new QuickNodeFunction(process.env.QUICKNODE_API_KEY!);

// export async function POST(request: NextRequest) {
//   try {
//     // Get and validate security token
//     const headersList = headers();
//     console.log('Received headers:', Object.fromEntries((await headersList).entries()));
    
//     const securityToken = (await headersList).get('x-api-key');
//     console.log('Security token:', securityToken);

//     if (securityToken !== process.env.QUICKNODE_WEBHOOK_TOKEN) {
//       console.log('Token mismatch:', {
//         received: securityToken,
//         expected: process.env.QUICKNODE_WEBHOOK_TOKEN
//       });
//       return NextResponse.json(
//         { error: 'Invalid security token' },
//         { status: 401 }
//       );
//     }

//     // Parse webhook payload
//     const rawBody = await request.text();
//     console.log('Raw webhook body:', rawBody);

//     const payload = rawBody ? (JSON.parse(rawBody) as WebhookPayload) : null;
//     console.log('Parsed payload:', payload);

//     if (!payload?.newTokens) {
//       return NextResponse.json(
//         { error: 'Empty payload' },
//         { status: 400 }
//       );
//     }

//     // Extract just the needed token data
//     const processedTokens = payload.newTokens.map(token => ({
//       mintAddress: token.mintAddress,
//       createdAt: token.createdAt,
//       signature: token.signature
//     }));

//     // Call the function with the simplified data structure
//     const result = await functionClient.invokeFunction(
//       process.env.QUICKNODE_FUNCTION_ID!,
//       {
//         stream_data: {
//           newTokens: processedTokens
//         }
//       }
//     );

//     console.log('Data before function call:', JSON.stringify({
//       stream_data: {
//         newTokens: processedTokens
//       }
//     }, null, 2));

//     console.log('Function result:', JSON.stringify(result, null, 2));
//     return NextResponse.json({ success: true, result });

//   } catch (error) {
//     console.error('Error processing webhook:', error);
//     if (error instanceof Error) {
//       console.error('Error details:', {
//         message: error.message,
//         stack: error.stack
//       });
//     }
//     return NextResponse.json(
//       { error: 'Failed to process webhook' },
//       { status: 500 }
//     );
//   }
// }

// import { NextApiRequest, NextApiResponse } from 'next';

// interface WebhookToken {
//   mintAddress: string;
//   createdAt: number;
//   signature: string;
// }

// interface WebhookPayload {
//   blockTime: number;
//   newTokens: WebhookToken[];
// }

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   try {
//     if (req.method !== 'POST') {
//       return res.status(405).json({ error: 'Method Not Allowed' });
//     }

//     // Get and validate security token
//     const securityToken = req.headers['x-api-key'];
//     if (securityToken !== process.env.QUICKNODE_WEBHOOK_TOKEN) {
//       return res.status(401).json({ error: 'Invalid security token' });
//     }

//     // Parse webhook payload
//     const payload: WebhookPayload = JSON.parse(req.body);

//     if (!payload?.newTokens || !Array.isArray(payload.newTokens)) {
//       return res.status(400).json({ error: 'Invalid payload' });
//     }

//     // Process tokens (bypassing the function)
//     const processedTokens: WebhookToken[] = payload.newTokens.map(token => ({
//       mintAddress: token.mintAddress,
//       createdAt: token.createdAt,
//       signature: token.signature
//     }));

//     // Here, instead of invoking a function, we'll just forward the data
//     await fetch('/api/tokens/stream', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(processedTokens)
//     });

//     res.status(200).json({ success: true, processedTokens });
//   } catch (error) {
//     console.error('Error processing webhook:', error);
//     res.status(500).json({ error: 'Failed to process webhook' });
//   }
// }

// import { NextApiRequest, NextApiResponse } from 'next';
// import { redis } from '@/lib/redis'; // You'll need to set up Redis
// import { Server as SocketIOServer } from 'socket.io';

// interface WebhookToken {
//   mintAddress: string;
//   createdAt: number;
//   signature: string;
// }

// interface WebhookPayload {
//   blockTime: number;
//   newTokens: WebhookToken[];
// }

// let io: SocketIOServer;

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   try {
//     if (req.method !== 'POST') {
//       return res.status(405).json({ error: 'Method Not Allowed' });
//     }

//     // Validate security token
//     const securityToken = req.headers['x-api-key'];
//     if (securityToken !== process.env.QUICKNODE_WEBHOOK_TOKEN) {
//       return res.status(401).json({ error: 'Invalid security token' });
//     }

//     const payload: WebhookPayload = JSON.parse(req.body);

//     if (!payload?.newTokens || !Array.isArray(payload.newTokens)) {
//       return res.status(400).json({ error: 'Invalid payload' });
//     }

//     // Process tokens
//     const processedTokens = payload.newTokens.map(token => ({
//       mintAddress: token.mintAddress,
//       createdAt: token.createdAt,
//       signature: token.signature
//     }));

//     // Store tokens in Redis
//     await Promise.all(
//       processedTokens.map(token => 
//         redis.set(`token:${token.mintAddress}`, JSON.stringify(token))
//       )
//     );

//     // Emit to connected clients using Socket.IO
//     if (!io) {
//       io = new SocketIOServer((res.socket as any).server);
//     }
//     io.emit('newTokens', processedTokens);

//     res.status(200).json({ success: true, processedTokens });
//   } catch (error) {
//     console.error('Error processing webhook:', error);
//     res.status(500).json({ error: 'Failed to process webhook' });
//   }
// }

// @ts-nocheck
import { NextResponse } from 'next/server'
import { pusherServer } from '@/lib/pusher'
import type { Token } from '@/types/token'

export async function POST(req: Request) {
  try {
    console.log('Webhook received')
    
    // Parse JSON from request body
    const body = await req.json()
    console.log('Webhook body:', JSON.stringify(body, null, 2))
    
    // Check if the payload structure is correct
    if (!body || !Array.isArray(body.newTokens) || body.newTokens.length === 0 || !body.newTokens[0].token || typeof body.newTokens[0].token !== 'object') {
      console.error('Invalid payload structure received')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const newToken = body.newTokens[0].token as Token
    console.log('New token:', JSON.stringify(newToken, null, 2))

    // Validate security token
    const securityToken = req.headers.get('x-api-key')
    console.log('Security token received:', securityToken)
    
    if (securityToken !== process.env.QUICKNODE_WEBHOOK_TOKEN) {
      console.error('Invalid security token')
      return NextResponse.json({ error: 'Invalid security token' }, { status: 401 })
    }

    // Trigger event on Pusher
    try {
      console.log('Attempting to trigger Pusher event on channel: tokens-channel')
      await pusherServer.trigger('tokens-channel', 'new-token', newToken)
      console.log('Pusher event triggered successfully')
    } catch (pusherError) {
      console.error('Pusher error:', {
        errorType: pusherError.name,
        errorMessage: pusherError.message,
        errorStack: pusherError.stack
      })
      return NextResponse.json({ error: 'Failed to trigger Pusher event' }, { status: 500 })
    }

    console.log('Webhook processing completed successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error details:', {
      errorType: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
// import { NextResponse } from 'next/server'
// import { pusherServer } from '@/lib/pusher'
// import type { Token } from '@/types/token'

// export async function POST(req: Request) {
//   try {
//     console.log('Webhook received')
    
//     // Parse JSON from request body
//     const body = await req.json()
//     console.log('Webhook body:', JSON.stringify(body, null, 2))
    
//     // Check if the payload structure is correct
//     if (!body || !body.token || typeof body.token !== 'object') {
//       console.error('Invalid payload structure received')
//       return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
//     }

//     const newToken = body.token as Token
//     console.log('New token:', JSON.stringify(newToken, null, 2))

//     // Validate security token
//     const securityToken = req.headers.get('x-api-key')
//     console.log('Security token received:', securityToken)
    
//     if (securityToken !== process.env.QUICKNODE_WEBHOOK_TOKEN) {
//       console.error('Invalid security token')
//       return NextResponse.json({ error: 'Invalid security token' }, { status: 401 })
//     }

//     // Trigger event on Pusher
//     try {
//       console.log('Attempting to trigger Pusher event on channel: tokens-channel')
//       await pusherServer.trigger('tokens-channel', 'new-token', newToken)
//       console.log('Pusher event triggered successfully')
//     } catch (pusherError) {
//       console.error('Pusher error:', {
//         errorType: pusherError.name,
//         errorMessage: pusherError.message,
//         errorStack: pusherError.stack
//       })
//       return NextResponse.json({ error: 'Failed to trigger Pusher event' }, { status: 500 })
//     }

//     console.log('Webhook processing completed successfully')
//     return NextResponse.json({ success: true })
//   } catch (error) {
//     console.error('Webhook error details:', {
//       errorType: error.name,
//       errorMessage: error.message,
//       errorStack: error.stack
//     })
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

// import { NextResponse } from 'next/server'
// import { pusherServer } from '@/lib/pusher'
// import type { Token } from '@/types/token'

// export async function POST(req: Request) {
//   try {
//     console.log('Webhook received')
    
//     const body = await req.json()
//     console.log('Webhook body:', body)
    
//     const newToken = body.token as Token
//     console.log('New token:', newToken)

//     // Validate security token
//     const securityToken = req.headers.get('x-api-key')
//     console.log('Security token received:', securityToken)
    
//     if (securityToken !== process.env.QUICKNODE_WEBHOOK_TOKEN) {
//       console.error('Invalid security token')
//       return NextResponse.json({ error: 'Invalid security token' }, { status: 401 })
//     }

//     // Trigger event on Pusher
//     console.log('Triggering Pusher event on channel: tokens-channel')
//     await pusherServer.trigger('tokens-channel', 'new-token', newToken)
//     console.log('Pusher event triggered successfully')

//     return NextResponse.json({ success: true })
//   } catch (error) {
//     console.error('Webhook error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

// Add this for GET requests, just for debugging or status check
export async function GET() {
  return NextResponse.json({ status: 'Webhook is operational', method: 'GET not allowed for actual webhook usage' }, { status: 200 });
}
// import { NextResponse } from 'next/server'
// import { pusherServer } from '@/lib/pusher'
// import type { Token } from '@/types/token'

// export async function POST(req: Request) {
//   try {
//     const body = await req.json()
//     const newToken = body.token as Token

//     // Validate security token
//     const securityToken = req.headers.get('x-api-key')
//     if (securityToken !== process.env.QUICKNODE_WEBHOOK_TOKEN) {
//       return NextResponse.json({ error: 'Invalid security token' }, { status: 401 })
//     }

//     // Trigger event on Pusher
//     await pusherServer.trigger('tokens-channel', 'new-token', newToken)

//     return NextResponse.json({ success: true })
//   } catch (error) {
//     console.error('Webhook error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }
// import { NextApiRequest, NextApiResponse } from 'next';
// import { tokenHelpers } from '@/lib/redis';
// import { Server as SocketIOServer } from 'socket.io';
// import type { Token } from '@/types/token';

// interface WebhookPayload {
//   blockTime: number;
//   newTokens: Token[];
// }

// let io: SocketIOServer;

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   try {
//     if (req.method !== 'POST') {
//       return res.status(405).json({ error: 'Method Not Allowed' });
//     }

//     // Validate security token
//     const securityToken = req.headers['x-api-key'];
//     if (securityToken !== process.env.QUICKNODE_WEBHOOK_TOKEN) {
//       return res.status(401).json({ error: 'Invalid security token' });
//     }

//     const payload: WebhookPayload = req.body;

//     if (!payload?.newTokens || !Array.isArray(payload.newTokens)) {
//       return res.status(400).json({ error: 'Invalid payload' });
//     }

//     // Process and store tokens
//     const processedTokens = await Promise.all(
//       payload.newTokens.map(async (token) => {
//         // Store in Redis
//         await tokenHelpers.storeToken(token);
//         return token;
//       })
//     );

//     // Initialize Socket.IO if not already initialized
//     if (!io) {
//       io = new SocketIOServer((res.socket as any).server);
      
//       // Set up Socket.IO error handling
//       io.on('connect_error', (error) => {
//         console.error('Socket.IO connection error:', error);
//       });
//     }

//     // Emit new tokens to all connected clients
//     processedTokens.forEach(token => {
//       io.emit('newToken', token);
//     });

//     res.status(200).json({ success: true, processedTokens });
//   } catch (error) {
//     console.error('Error processing webhook:', error);
//     res.status(500).json({ error: 'Failed to process webhook' });
//   }
// }
