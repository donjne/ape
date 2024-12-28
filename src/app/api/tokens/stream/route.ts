// import { NextRequest } from 'next/server';
// // import { headers } from 'next/headers';

// export const runtime = 'edge';

// export async function GET(request: NextRequest) {
//   const encoder = new TextEncoder();

//   const stream = new ReadableStream({
//     async start(controller) {
//       // Function to send a heartbeat to keep the connection alive
//       const heartbeat = () => {
//         controller.enqueue(encoder.encode(':\n\n'));
//       };

//       // Send heartbeat every 30 seconds
//       const heartbeatInterval = setInterval(heartbeat, 30000);

//       // Clean up on close
//       request.signal.addEventListener('abort', () => {
//         clearInterval(heartbeatInterval);
//       });

//       try {
//         // Initial connection message
//         controller.enqueue(encoder.encode('event: connected\ndata: true\n\n'));

//         // Keep the connection alive
//         while (true) {
//           if (request.signal.aborted) {
//             break;
//           }
          
//           // Wait for 1 second before next iteration
//           await new Promise(resolve => setTimeout(resolve, 1000));
//         }
//       } catch (error) {
//         console.error('Stream error:', error);
//       } finally {
//         clearInterval(heartbeatInterval);
//         controller.close();
//       }
//     }
//   });

//   return new Response(stream, {
//     headers: {
//       'Content-Type': 'text/event-stream',
//       'Cache-Control': 'no-cache',
//       'Connection': 'keep-alive',
//     },
//   });
// }

//app/api/tokens/stream/route.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';

interface Token {
  mintAddress: string;
  createdAt: number;
  signature: string;
}

let tokens: Token[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send existing tokens on connection
  tokens.forEach(token => {
    res.write(`data: ${JSON.stringify(token)}\n\n`);
  });

  // Listen for new tokens
  const listenForNewTokens = async () => {
    try {
      // Simulating listening for new tokens from the webhook or another source
      const response = await fetch('/api/webhooks/quicknode', { method: 'POST' });
      const newTokens: Token[] = await response.json();

      newTokens.forEach(token => {
        tokens.push(token);
        // Send the new token through SSE
        res.write(`data: ${JSON.stringify(token)}\n\n`);
      });

      // Keep the connection alive
      const keepAliveInterval = setInterval(() => {
        res.write(': keep-alive\n\n');
      }, 30000);

      // Wait for the connection to be closed
      req.on('close', () => {
        clearInterval(keepAliveInterval);
        res.end();
      });
    } catch (error) {
      console.error('Error while streaming:', error);
      res.status(500).end();
    }
  };

  listenForNewTokens();
}