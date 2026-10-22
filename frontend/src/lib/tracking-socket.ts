import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getTrackingSocket = (): Socket => {
  if (!socket) {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
      (typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : '');

    socket = io(`${backendUrl}/tracking`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }

  return socket;
};
