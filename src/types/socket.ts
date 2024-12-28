// types/socket.ts
import { Token } from './token';

export interface ServerToClientEvents {
  newToken: (token: Token) => void;
  tokenUpdate: (token: Token) => void;
  error: (error: { message: string }) => void;
}

export interface ClientToServerEvents {
  subscribe: (mintAddress: string) => void;
  unsubscribe: (mintAddress: string) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  subscribedTokens: string[];
}