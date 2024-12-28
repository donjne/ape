// server.ts
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Socket as SocketIOSocket } from 'socket.io';
import { Token } from '@/types/token';

// Define your event types
interface ServerToClientEvents {
  newToken: (token: Token) => void;
  tokenUpdate: (token: Token) => void;
  error: (error: { message: string }) => void;
}

interface ClientToServerEvents {
  subscribe: (mintAddress: string) => void;
  unsubscribe: (mintAddress: string) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  userId: string;
  subscribedTokens: string[];
}

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

export const initSocketServer = async () => {
  try {
    await app.prepare();

    const server: HTTPServer = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req as NextApiRequest, res as NextApiResponse, parsedUrl);
    });

    // Initialize Socket.IO with type definitions
    const io = new SocketIOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    // Socket.IO connection handling
    io.on('connection', (socket: SocketIOSocket) => {
      console.log('Client connected:', socket.id);

      // Set initial socket data
      socket.data.subscribedTokens = [];

      socket.on('subscribe', (mintAddress: string) => {
        socket.data.subscribedTokens.push(mintAddress);
        socket.join(mintAddress);
      });

      socket.on('unsubscribe', (mintAddress: string) => {
        socket.data.subscribedTokens = socket.data.subscribedTokens.filter(
            (addr: string) => addr !== mintAddress
        );
        socket.leave(mintAddress);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`> Ready on http://localhost:${PORT}`);
    });

    return io;
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

export default initSocketServer;