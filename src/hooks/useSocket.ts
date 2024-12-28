// // hooks/useSocket.ts
// import { useEffect, useRef } from 'react';
// import { io, Socket } from 'socket.io-client';
// import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket';

// export const useSocket = () => {
//   const socket = useRef<Socket<ServerToClientEvents, ClientToServerEvents>>();

//   useEffect(() => {
//     if (!socket.current) {
//       const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
      
//       if (!WEBSOCKET_URL) {
//         console.error('NEXT_PUBLIC_WEBSOCKET_URL is not defined');
//         return;
//       }

//       socket.current = io(WEBSOCKET_URL, {
//         transports: ['websocket'],
//         reconnectionDelay: 1000,
//         reconnectionDelayMax: 5000,
//         reconnectionAttempts: 10,
//       });

//       socket.current.on('connect', () => {
//         console.log('Connected to WebSocket server');
//       });

//       socket.current.on('connect_error', (error) => {
//         console.error('WebSocket connection error:', error);
//       });
//     }

//     return () => {
//       if (socket.current) {
//         socket.current.disconnect();
//         socket.current = undefined;
//       }
//     };
//   }, []);

//   return socket.current;
// };